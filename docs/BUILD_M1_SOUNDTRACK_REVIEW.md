# M1 local soundtrack — focused implementation review

## 1. Scope

Creator says the synth music feels lackluster and asks about jazz they generate in Suno. Implemented version 0.4.0 is a local single-track MP3/WAV player with loop, pause/resume, shared volume and synth fallback. Creator chooses the file. No Suno API/login, download, generator call, purchase, bundled recording, playlist, stem remix, save migration or new runtime dependency.

One independent Kibitz partner per build round, user-scoped r3 only; no r1/r2/r4. Codex/Sol High driver. Default Gemini 4 Argon (High), checked available before fanout; no duplicate driver/AGY Opus.

## 2. Implementation and invariants

`public/soundtrack.js` wraps the existing MusicSketch interface. One selected file becomes a browser object URL, native Audio (metadata preload, loop), pause/volume/play via explicit gesture. Stops cancel async starts; replacement/return revokes old URL and detaches old media source. File validation accepts nonempty MP3/WAV <=100MB, invalid selection preserves old track, decode errors report recoverable status. Hidden/pagehide stop music without auto-resume. Returning to synth stops everything and clears local selection. Browser unload owns final URL cleanup; no file/name/URL saved in localStorage or quest state.

`public/game.js` uses the wrapper, central soundUI/toggleMusic and Choose music dialog. File names/status are assigned as textContent, never interpolated into HTML. Local mode hides procedural stem indicators because a full track does not respond to quest stems. Shared stored volume applies to both paths, selection lasts only this tab. The main toggle, dialog and hidden-state labels stay consistent. Native decode failure leaves a fallback option. `window.tenderloin.sound()` is read-only diagnostics, not a quest or playback bypass.

`public/index.html`/CSS add a music button, file picker, native volume and responsive status. Current native modal/focus guards remain, including explicit focus when Return to synth sketch becomes disabled. Navigation round immediately before this one was reviewed/tested; do not redesign geography/quests.

## 3. Current evidence and focused request

33 Node tests pass: existing 28 plus local playback start/stop/volume/loop/exclusivity, URL cleanup/validation, pending-start cancellation/replacement, hidden completion/error/fallback. Syntax passes. Full Chrome completion/navigation suite is rerunning with native WAV decode/play, position advance, pause, volume, malicious-looking filename kept as text, invalid/corrupt selection, replacement, fallback focus and reload without autoplay. Browser fixture is an original quiet test tone, not a real song. No physical device, listening-quality or rights certification.

Read actual sources/tests and verify integration races, cleanup, native media errors, visibility, accessibility/overflow, fallback and save privacy. Write only your report. Do not read historical partner reports or current driver anchor and do not edit application/tests/docs. Cite file/line evidence; distinguish blockers from optional playlist/polish ideas. No paid generation or re-review of unchanged code required.
