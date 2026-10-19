# Manual Claude review prompt

Status: this prompt has been completed. The returned report is CLAUDE_MANUAL_REVIEW.md and the driver's decisions are in MANUAL_REVIEW_SYNTHESIS.md. Retain the prompt below as the historical request; future reviews should use a new report path rather than overwrite the original.

Use Claude Opus 5.5 in your own Claude session if available. This prompt does not launch any agent or spend AGY credits. Paste the following into Claude Code opened at C:\tenderloin-redux, or attach CONCEPT.md, SOURCES.md, and TENDERVOICE_REUSE_RESEARCH.md in a Claude chat.

---

Please independently review Tenderloin Redux and suggest additional ideas. This is a concept review, not permission to implement anything or run other paid agents.

Read C:\tenderloin-redux\docs\CONCEPT.md, C:\tenderloin-redux\docs\SOURCES.md, and C:\tenderloin-redux\docs\TENDERVOICE_REUSE_RESEARCH.md. If you cannot read the files, ask me to attach them rather than inventing their contents. Do not read previous reviewers' reports before writing your own opinion.

The creator is making a constructive response to the video game Tenderloin Night Shift: show that games can inspire care, creativity, and greatness. The game is a peaceful neighborhood adventure with geographically accurate Tenderloin streets, residents and real nonprofit discovery, cleanup, permissioned original hip-hop murals, real history/festivals, original muted-trumpet jazz, a lively Transgender District, and occasional political events and movie shoots.

Preserve those larger ambitions while keeping the first playable small. The current proposal is a resident-led gathering around Turk and Taylor with space arrangement, a collaborative mural, and soundcheck. Give neighbors their own skills, humor, relationships, and agency. Never treat people or personal belongings as cleanup targets, and do not make basic help conditional on player chores.

TenderVoice reuse is conditional: no usable source-and-license pair has been verified. Do not assume its code, interviews, photos, or name are cleared for reuse. Our original Neighborhood Voices feature is experimental and default off, with one easy switch. Disabling it must stop optional content/audio and leave the full core game and saves working. A disabled flag does not make unlicensed assets acceptable to bundle.

Please return:

1. Your strongest six concrete gameplay ideas, ranked. For each, explain what the player actually does, what makes it enjoyable, what visibly changes, and whether it belongs in the first playable or later.
2. The three largest weaknesses in the current concept and the smallest practical fixes. Separate factual findings from your design judgments.
3. A coherent 10-15 minute opening session with one meaningful nonviolent choice and a satisfying ending.
4. A compact implementation outline for that opening and the optional-module boundary; identify decisions that still need a prototype rather than designing a large engine.
5. Checks that would prove the experiment can be turned off, including audio cleanup and loading a save created while it was enabled.
6. Any external claims that need verification, with sources if available. Do not invent local geography, affiliations, music rights, licenses, or proven social impact.

Do not run AGY or other paid reviewers, change code, contact anyone, commit, push, or publish. Do not turn the game into a service-directory quiz, a lecture, a property-value simulator, or a set of repetitive chores. Keep the ideas specific and playable.

If working in Claude Code, write only C:\tenderloin-redux\docs\CLAUDE_MANUAL_REVIEW.md. If working in the Claude chat app, return the report in chat so I can paste it back to Codex. State the model actually used if your environment exposes it; do not guess. At the time this original prompt was issued, no review file existed yet.
