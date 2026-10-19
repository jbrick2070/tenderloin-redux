# Source-grounded driver anchor, before fanout

VERDICT: yes-with-verification. Small local audio wrapper preserves fallback, quest and save interfaces; one focused independent review appropriate.

MUST-FIX BEFORE ACCEPTANCE
1. [3, CONFIRMED] Final source-fingerprint browser run must follow any review changes. Current complete Chrome suite passed native WAV play-position, pause/volume/replacement/fallback, malformed file and safe text filename with both main endings, but an additional hidden preflight was then added and unit-checked. Preserve exact final evidence.

SHOULD-FIX / VERIFY
1. [2, CONFIRMED] soundtrack.js validates extension/size before replacing file, uses object URL and native Audio, explicitly waits for Play, loops, and revokes/detaches old source in useSketch. No file metadata enters core save or settings; no fetch/upload code.
2. [2, CONFIRMED] start/stop generation guard prevents stale promises re-enabling a stopped/replaced track. Hidden check before and after play. Fallback MusicSketch's independent generation guard remains. Tests cover stop/replacement and hidden/error completion. Verify overlapping native media callbacks and mode-switch timing.
3. [2, CONFIRMED] game.js soundUI updates mode-specific captions, hides synthetic progress stems for full-track mode, and uses textContent for untrusted basename/error. Return-to-sketch transfers focus before disabled control becomes inert. Read-only sound diagnostics support actual browser position checks.
4. [2, CONFIRMED] Shared volume is stored as previous preferences only; reload returns silent sketch and requires local file re-selection. UI states the tab-only behavior. MP3 native decoding remains a compatibility boundary; WAV is covered in Chrome with a test-only tone.
5. [3, UNVERIFIABLE] Suno result quality and physical device sound are not tested because no real user track was provided. Do not certify the score, imply source licensing from file selection, or make a purchase. Official terms/FAQ links in SUNO_MUSIC_BRIEF distinguish eventual release provenance from a local player.

OPTIONAL: playlist, crossfade, soundtrack integration by chapter remain later.
CUT: API/auth, retained file handles, IndexedDB file storage, waveform editors, new dependencies or more partner panels.
