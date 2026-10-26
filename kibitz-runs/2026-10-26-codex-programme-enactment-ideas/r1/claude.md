TOOL CHECK: PASS (read godot/main.gd 9770-10019, godot/programme_studio.gd 1-423, godot/hosted_afternoon.gd 1-66 and targeted ranges listed below).

VERDICT: no. The brief's boundaries are accurate, but its goal ("meaningful contribution choices") and its leading method (Option 1: "use validated original ... copies") contradict each other. It also leaves undefined what the player chooses, which invitation is meant, and where a second gathering sits relative to the ending. In the shipped copy and in a test, the game currently promises that no second gathering happens.

Source-confirmed citations (all hold against current bytes):
- godot/main.gd:9783-9811 programme_issue. The quiet-interval rule applies only when beats_at < stories_at (9809).
- godot/main.gd:9846-9867 programme_publish. It refuses only when programme_order == programme_published (9851). It never compares against hosting_order.
- godot/main.gd:9869-9870 is_hosting_ready_to_start requires hosting_order.is_empty(). godot/main.gd:9892-9907 host_start clears hosting_results.
- godot/main.gd:9909-10000 host_set_* and host_complete_current mutate hosting_draft/hosting_results and save.
- godot/programme_studio.gd:116-137 open_studio gates. :120-121 refuses while the original hosting is incomplete. :353-359 _process re-hides every sibling captured in saved_visibility on every frame.
- godot/main.gd:14726-14730 dispatches Escape to programme_studio.close_studio.
- godot/main.gd:13035-13064 apply_save_envelope resets visit modules, then closes the studio (13057).
- godot/hosted_afternoon.gd:56-57 invitation_available = is_hosting_done and civic available and civic_phase in idle/planning/meeting.

MUST-FIX BEFORE BUILD

1. [Actual missing player outcome] vs [Options 1]: the goal and the method diverge.
   - The outcome requires "meaningful contribution choices".
   - Option 1 replays the four original copied values (Hosted.copied, hosted_afternoon.gd:7-21) in a new order. The only new interaction it names is an undefined "meaningful spatial/social choice".
   - Two features already exist and cover most of what an undefined Option 1 would show:
     a) Order-dependent resident lines for any posted order: programme_studio.gd:264-269 replies(), shown in the Posted view at :281-284.
     b) Per-segment copied results with resident replies: hosted_afternoon.gd:23-49 detail().
   - Without a defined choice, Option 1 becomes "four Next buttons plus a retrospective reader", which the brief itself rejects.
   - Fix: before selection, define the per-step choice and its consequence concretely. Smallest defensible version: author by adjacent transition, not by whole order.
     - Of the 12 ordered segment pairs, beats immediately followed by stories is always invalid (main.gd:9809 requires pause between them). That leaves 11 handoff pairs, plus 4 opening cases.
     - At each of the 3 transitions the player picks one of 2 authored gestures, for example "ask the outgoing host to hand over" or "leave a held moment before the next host".
     - The handoff response depends on the pair plus the gesture.
     - That is bounded authoring (about 22 transition lines plus 4 openings), and sequence then matters by construction.

2. [Boundaries] / [Acceptance] omit an existing shipped contract that the feature directly negates.
   - programme_studio.gd:275 says "They do not start a second gathering or change the one you hosted."
   - programme_studio.gd:293 says "This pinboard imagines another afternoon; it does not start a second gathering."
   - godot/tests/hosted_afternoon_checks.gd:117 requires description().contains("does not start a second gathering").
   - [Measured scope] demands preserving "every original complete browser matrix" and all native checks. As written, that conflicts with building the feature at all.
   - Fix: list these two strings and the one test assertion as deliberate revisions. Replace them with the new boundary ("a visit-only second afternoon; the one you hosted is unchanged") and a test that asserts it.

3. [Missing outcome] / [Acceptance]: "the invitation" is ambiguous.
   - "Retained access after declining the invitation" and "decline/re-enter the retained invitation" could mean either of two things:
     a) Bea's existing Listening Hour offer (programme_studio.gd:246-262; hosted_afternoon.gd:56-66).
     b) A new invitation to enact the posted plan.
   - These have different owners, focus targets and refusal rules.
   - Fix: name the new invitation and its single entry point. Recommended entry: the Studio Posted-view primary button. After hosting is done, it is currently a dead "Posted" label: programme_studio.gd:332-333 disables it when draft == published.
   - "Decline" = Back/Escape. "Retained" = it is offered again whenever a valid posted plan exists and is_hosting_done(). Bea's Listening Hour offer must stay untouched and separately reachable.

4. [Options] / [Boundaries]: the gathering's place in the arc is missing.
   - The brief never says whether enactment is available before or after Listening Hour, film, habitat, orbital commons, or "Return home".
   - Downstream text assumes a single gathering:
     - hosted_afternoon.gd:62: "Our afternoon began with %s and ended with %s"
     - orbital_commons.gd:209: "Bea folds our ... paper after the gathering"
   - Habitat copies only film/civic/hosted data (habitat_room.gd:144-147).
   - A player who enacts a revised order and then hears "our afternoon began with X" (the old X) will read it as a bug unless something disambiguates.
   - Fix: state that enactment is available whenever is_hosting_done() and the Studio opens, at any civic/finale phase.
   - State that all downstream modules intentionally keep referring to the first afternoon.
   - Have the enactment's closure line say so once (for example "Listening Hour and the film keep our first afternoon"). Do not edit the downstream modules.

5. [Option 1] "spatial/social choice" contradicts [Ask] "No ... route/camera/audio ownership".
   - The one existing visit-local walking child needed its own space ("This child never owns the street", orbital_commons.gd:2) and was a large module.
   - Fix: drop "spatial". Make the choice a social gesture with a 2D composed picture. Otherwise, explicitly budget a walkable/staged space, which I do not recommend inside 10000B.

6. [Options 1, 2] / [Missing outcome]: identical-order eligibility is unresolved, and nothing enforces "different".
   - programme_publish checks only against programme_published (main.gd:9851). After hosting, published equals hosting_order until revised.
   - A player can also revise away and then back to the hosted order and repost it.
   - Fix: pick one rule.
     - Recommended: allow any valid posted order, including the hosted one, and add one authored acknowledgment line ("the same order again"). That avoids a confusing extra gate.
     - Alternative: refuse with an honest message when published == hosting_order. That needs a refusal test.

7. [Measured scope] assumes 10000B will fit with no estimate.
   - For scale, programme_studio.gd is 423 lines with long string literals and inline SVG (:387-395) [ASSUMPTION: a child of comparable scope approaches or exceeds 10000B as exported].
   - godot/export_presets.cfg sets no script_export_mode, so whether scripts ship as text or tokens depends on the engine default. verify: Godot version and the effective script export mode, because this changes the per-line cost materially.
   - Fix: before selection, cap the new authored text (about 30 lines) and require reuse of existing texture builders:
     - bea_invitation.texture (used at programme_studio.gd:306)
     - shared_panel.texture (programme_studio.gd:307)
     - programme_studio texture/artwork (:387-406)
   - Allow no new SVG beyond a composition overlay.

SHOULD-FIX

1. [Option 1] "Compare extending Programme Studio mode versus a separately owned child": decide now and use a separate child.
   - Studio already branches three ways (draft/posted/hosted_view) through refresh() and description() (programme_studio.gd:271-296, 315-351). A fourth mode multiplies those branches.
   - Precedent for a visit-local child with reset_visit(): shared_meal.gd:2 and :136; habitat_room, helper_bench, before_streets and story_picker reset at main.gd:13036-13040.
   - The child must:
     a) Close Studio before opening, as follow_hosted_invitation does at programme_studio.gd:251. If Studio stays visible, its _process (:358-359) re-hides any sibling it captured at open time.
     b) Add its own Escape branch next to main.gd:14726.
     c) Register reset_visit() in apply_save_envelope (13036 block). verify: the import_browser_save_json success path near main.gd:13606 and any reload/fresh-run path call the same reset list (not read in this review).

2. [Option 2] contradicts the brief's own anti-duplication rule.
   - rhythm_circle already has a visit-only post-hosting Practice mode: rhythm_circle.gd:2 "practice never enters the save model", :260-261, :274.
   - The brief bans "rebuilding existing rhythm practice" only for Option 3. Option 2's "silent eight-slot rhythm including literal zero" is that same practice editor.
   - Option 2 would also need adapters in four modules that read game.hosting_draft gated on current_hosting_activity():
     - rhythm_circle.gd:217-218
     - shared_panel.gd:112-118
     - bea_invitation.gd:50
     - quiet_seats.gd:102
   - Their 3D world renders (for example rhythm_circle.gd:222-234 update_world) also show the original copies, which raises world ownership questions.
   - See CUT 1.

3. [Option 1] The "four specific resident responses" must not duplicate replies() (programme_studio.gd:264-269), which already gives Bea/Dez/Celeste/Thanh order-dependent lines for the posted plan.
   - Fix: make the enactment responses react to the player's handoff gesture and to the copied value. For example, Dez reacting to zero beats, consistent with hosted_afternoon.gd:41-42. Leave plan-level commentary to replies().

4. [Boundaries] "Reposting/editing must not rewrite an active copied run": state the mechanism.
   - Enactment copies programme_published once at start into child-local state.
   - Studio stays openable during a partial enactment. Its existing gate (programme_studio.gd:120) concerns only the original hosting and needs no change.
   - The enactment always displays its own copied order.

5. [Acceptance] "Invalid prerequisites/order/copies must refuse honestly": specify what happens when one Hosted.copied(...).valid is false.
   - That function returns {"valid":false} on a corrupted import (hosted_afternoon.gd:21).
   - Recommended: the step still runs, using detail()'s existing "copied choice is unavailable" wording (hosted_afternoon.gd:29), instead of refusing the whole enactment.

OPTIONAL / NICE-TO-HAVE

- Keep Option 3 only as a measured fallback, if the post-implementation export overruns the contingency. It is not a parallel design.
- The visible consequence can be one composed picture: the four copied textures laid out in the enacted order, with a mark per transition gesture. It costs no new art assets.

CUT THESE

1. Option 2 (fully editable second afternoon). It duplicates rhythm Practice and needs four global-coupled adapters plus world-render ownership (Should-fix 2). It is the least likely to fit 10000B. It is safe to cut because Option 1 meets the outcome once Must-fix 1 defines the choice.
2. The "[Prior art and originality]" paragraph, reduced to one line. It drives no design decision and explicitly claims nothing.
3. The Studio-mode-versus-child comparison. Decide child now (Should-fix 1) so the r1/r3 budget is not spent re-deriving it.
4. "Spatial" interaction in Option 1 (Must-fix 5). It is the only part that would pull in walking/camera concerns the brief already forbids.
5. Partial resume [ASSUMPTION: optional simplification]. If enactment is 4 short steps, leaving mid-run could discard with an honest "unfinished, nothing saved" notice. That removes one state from the reset/close/reentry matrix. Keep the resume requirement only if the playtest goal needs it.
6. The deferred durable-archive paragraph, reduced to one sentence. It is already out of scope and only adds review surface.

Recommended coherent slice (for the driver to ground):
- Option 1, refined as "Gather again", opened from the Studio Posted view.
- A separate visit-local child with reset_visit().
- Four steps in the copied posted order, each showing the existing copied texture or result.
- A 2-way handoff gesture at each of the 3 transitions, with responses keyed by adjacent pair plus gesture (11 valid pairs).
- One closure line from Bea that keeps the first afternoon canonical for Listening Hour, film and ending.
- No save writes, cues, rewards or downstream mutation.
- The studio copy at programme_studio.gd:275/293 and the test at tests/hosted_afternoon_checks.gd:117 are revised deliberately.
