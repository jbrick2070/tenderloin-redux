# Review scope: return from inspection to walking

Baseline cf339d234647df211906c6f28d0f10092089332e. Creator-authorized bounded Godot usability round; Codex sole writer. Review current working changes read-only, write only your claude.md report, run no tests or builds.

Problem: landmark inspection detaches the camera with views 52-96m. Existing movement only shrinks views >110, so resuming leaves the character small. New resume_walking_view() distinguishes detached inspection/pan from Map and existing follow. A new movement intent from inspection/pan sets45m, Map uses75m, existing follow preserves deliberate zoom (including125m). Preserve yaw/pitch, since manual input was already camera-relative. No teleportation or progress change.

Six callers: walk_step, walk_to_neighbor, walk_to_mural, walk_to_speaker, walk_to_history_stop, walk_to_point. Delay overview/follow flag changes until a validated path or immediate arrival, so rejected requests keep inspection camera and a retry can still reframe. Immediate arrival retains the existing finish/conversation behavior after setting the follow flags. No change to passive advance_walk: dragging during an active route still leaves the camera detached until another walking intent or Find Me.

Native tests cover six entry paths, position/save preservation, yaw/pitch, intentional wide follow zoom, failure and valid retry. Browser end-of-suite checks use Shift+H inspection, real W down/up, a second inspection and H route start, actual Stop; fresh camera snapshots, player projection, saves and screenshots at each required viewport. New readonly following_player snapshot field. Verify coverage is meaningful and does not affect earlier tests.

Hard boundaries: no public/ modification, fingerprint2a9641a83499cdb6ba7f7c43d6cd9c8fa7ce34ce689b3be461b1f21ae5f84567; legacy savev1 read-only; saves<=4096; every main.gd nonASCII glyph supported. Preserve exact city geometry, provenance, progress, sounds/preferences and compact UI. First-person remains optional research, no migration. All five final gates are mandatory; physical phones, full screen readers and human comfort remain unverified.

Review route/camera sequencing, immediate arrival, failure paths, zoom and passive drag behavior. Ground findings in real source and propose minimal fixes. Do not demand larger UI/engine refactors or extra external model calls. Native candidate now passes; initial CRLF normalization failure is retained and corrected to original LF bytes. Export/browser verification is underway, not yet claimed passed.
