# Failure evidence

- artifacts/resume-view-native-candidate.log: initial file-writing helper used Windows CRLF output for source files that are stored as LF. This also changed an existing multiline GDScript string comparison and failed the walking-status assertion. Restored LF bytes in only the three edited source files; the diff returned to the bounded camera/tests change. artifacts/resume-view-native-candidate-fixed.log passed GODOT_STUDY_PASS. No public/ files were touched.
- Candidate export/check/104 Node tests passed; browser and independent review remain pending at the time of this note. Final verification.json will identify which logs apply to final source.

- artifacts/resume-view-legacy-fixture-failure.json/.png/.log: desktop camera transitions and route stop succeeded, then the new final legacy-save assertion expected the startup sentinel. Existing import tests had deliberately replaced that fixture earlier. Fixed the assertion to compare its immediately preceding legacy value; no product save writes changed.
- First post-review edit helper stopped on Python's default cp1252 decoding before changing source. Re-ran with explicit UTF-8 mode and LF byte output. The preliminary native-reviewed log was not final evidence; the subsequent run applies all fixes.
- Independent screenshot inspection found pre-existing long So What reward-title clipping in detached and resumed desktop views, plus truncation of the detached hub detail row. Camera framing succeeds; text cleanup remains open.

- Final verification: all five post-review gates pass on source_after_fixes.json hashes, errors/external empty at all three sizes. All nine fresh camera screenshots inspected. The320px manual-resume screenshot reveals objective-arrow/Talk-prompt overlap; player remains visible, and the route screenshot does not show that overlap. This remains a bounded next readability candidate.
