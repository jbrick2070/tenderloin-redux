# Current core-activity freedom audit - October25,2026

Baseline8f6a73d0874f108dd95bde9fca188b68388deb25, accepted/pushed with all-five proof. This is a source audit and tentative pre-code topic, not new implementation or full runtime acceptance. Completed slices stay closed.

| Existing contract | Source evidence | Audit judgment |
|---|---|---|
| Four story visits can switch/suspend this visit | story_picker.gd open_picker/select_story/suspended; previous active story is closed before picker opens | Old brief claiming active-story refusal is stale; no selector rebuild |
| Four cooks and earned internal invitations | shared_meal.gd; accepted cooking checkpoint8cf022f | Closed; no recipe/menu rebuild |
| Hosted rhythm is revisitable as visit-only practice | rhythm_circle.gd available/active_pattern/open_circle; current beats or has_hosted_segment beats, practice when not current | Existing access; no new persistent practice state |
| Shared art reopens its copied result after hosting | shared_panel.gd109-135 available/editing/plan/open_panel | Existing read-only copy preserved; no rewrite of hung panel |
| Bea invitation and quiet seating preserve copied choices | bea_invitation.gd47-59 choice/explanation; quiet_seats.gd100-111 choice/explanation | Existing story/quiet world consequence and remembered content, not missing unlocks |
| Civic completion earns retained Dez->film choice | civic_listening.gd invitation_available/follow_invitation; main.civic_completion_acknowledgment | Closed accepted8f6a73d; no duplicate handoff |
| Completed film remains watchable | film_screening.gd available/open_screening; main.is_film_available | Existing completed-film access, not a relock/restart gap |
| Programme Studio remains future draft/posted editor | programme_studio.gd112-116 refuses revisions while running; description233-260 and refresh264-289 show only Draft/Posted future plan | Intentional copied-running/future separation must stay |
| Four hosted results are durable and drive original scene consequences | main.gd9843-9856 is_hosting_done/has_hosted_segment/get_hosted_segment_value; host_complete_current9928-9968 appends the selected result and updates3D/save | Existing completion/access/consequence; do not claim no acknowledgment or missing state |
| Completed hosting wrapper gives generic Bea->Listening prompt | main.gd10009-10061 advance_programme_and_hosting_step; is_civic_available10067-10068 | A candidate remaining gap is specific recognition of the actual copied four-result gathering plus a retained player-chosen Listening invitation, rather than generic4/4/automatic objective |

Tentative bounded player outcome: review the afternoon actually hosted (not a newly revised future poster), hear specific original feedback reflecting real copied story/rhythm/art/pause choices, retain an earned Follow/Keep invitation into the existing phase-accurate Listening Hour without starting/closing it automatically. A readable hosted-results surface would extend actual missing replay/recognition rather than add another omniscient quest selector. No mechanics or surface selected until the NEW exact r1 is grounded.

Existing source already has generic completion text, copied worlds and durable access. The new work must not be sold as inventing those. If the reviewer/driver audit shows no worthwhile substantive gap, close the audit honestly and advance the historical-opening queue under its own source/review scope. No code should be invented merely to fill the queue. Native/actual GUI proof remains pending, with exact custom native isolation required before any standalone probe.

## Newly grounded open arc boundary

Programme future revisions remain an imagined pinboard after the first gathering: is_hosting_ready_to_start requires hosting_order empty, and completed hosting remains durable until reset/import. Rehosting a revised programme is not implemented. This is an open core arc question for a later bounded source-grounded choice; the selected Hosted review will disclose the limitation and never clear earned progress to fake replay.

## Checkpoint closure

The above baseline audit/pre-code candidate is historical. Its selected Hosted review/Bea invitation is now implemented, reviewed and all-five locally verified in the source checkpoint containing this note; see handoff/BUILD_STATUS and hosted-afternoon r3/verification.json. Existing selectors/cooking/Dez handoff remain closed. Future programme enactment remains the open arc boundary stated above, not implemented by this review.
