# Background music and playability diagnosis

Status: bounded diagnosis completed after recovery; no audio repair implemented or published. Baseline c53d987390608e67f8c8d86aa655e5079b448487. Current checkpoint and ownership live in session_handoff.md / BUILD_STATUS.md.

The creator reported choppy/static-like beat endings and an overly chippy sound. Fresh isolated Chrome profiles reproduce roughly half-second exact-zero gaps in actual captured destination audio while the game's Music state reports On. Music Off produces actual zero output. Both ordinary desktop and Android-emulated touch journeys reached conversation, walking/Stop/resume, map return and Rook's soundcheck, with the overall rejected harness runs retained separately. The final phone result completed before the Windows restart, but its process exit receipt is unavailable.

## Evidence and scope

- `artifacts/music-playability-20261024/probe1-execution.json`: initial headless desktop/Android audio diagnosis, observed exit0,130 source/export hashes unchanged. Raw Float32 PCM, audio-clock blocks, frame/long-task timestamps and screenshots retained.
- `headed1/`: same local gaps in headed Chrome; ANGLE/NVIDIA hardware renderer; CPU profiles show substantial samples in getParameter inside blitOffscreenFramebuffer/frame commit. Exact engine/driver cause remains unknown.
- `headed-control1/`: twelve-second headed control without AudioNode hook, AudioWorklet observer or waitForFunction during measurement still recorded ten long tasks, maximum511ms. This rules out the audio observer as a necessary cause of those local frame stalls; it is not audio-output proof or universal performance analysis.
- `journey1/` and `journey2/`: rejected diagnostic assumptions (Walk & Talk reopened Bea; Tenderloin Map uses in_wide_overview). No product fix was inferred from those failures.
- `journey3/`: desktop journey completed; subsequent phone disclosure assertion failed. Exact pre-input state was not retained, so the proposed redundant-toggle explanation remains provisional.
- `journey4-phone/`: final Android-emulated result has errors[], consoleErrors[], external[], changed[]. Actual Music Off samples are exactly zero; music-on windows have456-485ms silence. Saved results are complete, but session91525 exit is unknown after restart.
- `recovery-checkpoint-20261024.json`: post-restart source/save/live-release identity and recovery evidence. Native ASFOUND1272B hash remains2b7d1e849b4820a1d6c49602930ac3e0b104a8aa132375837038bfef80f2e0e1. No raw userdata staged.

Browser emulation does not establish physical Android/iPhone behavior, human pacing or listening quality. Reported source RMS and AudioContext running state alone are not destination continuity. The diagnostic adjacent-sample jump count is an investigative metric, not an acceptance threshold.

## Source-grounded hypotheses and constraints

Background sketch generation fills a0.25-second AudioStreamGenerator from the main frame loop. The bass changes frequency against global elapsed time; brush/chord/lead transitions also have abrupt boundaries. Equation-derived adjacent discontinuities are separate from captured jumps at underflow edges; they must not be conflated. Native AudioStreamGenerator is not the finite optional RhythmBar path, whose earlier sample repair remains preserved.

The actual exported Godot4.7.2 JavaScript (SHA25633c94cb3175f3333b82e2a3be5e8e86f77986f0aa2042b1631f6367a4e5bb6ba) restarts native sample loops from ended callbacks on the main thread. Its position worklet (SHA256be33985bc7160d6bf9646f259cd86b259cd67b02ccb297ee5c44f8ac84327bc8) has an initial reset window. A four-WAV loop replacement is therefore not selected without multiple-loop, common-clock and lifecycle evidence. Larger buffering only postpones some stalls and is not an accepted root repair.

Any selected transport must preserve real-gesture autoplay admission, Music/Sounds/volume/quiet, exact silence when paused, local-track exclusivity, reset/load/teardown, all active stems on a shared clock, rhythm cues and current-volume duck restoration. RhythmCircle currently references generator-frame accounting and directly ducks sketch_player; those are real integration dependencies. A separate WebAudio context must not silently bypass existing actual-output observation or lifecycle ownership. -80dB attenuation is not mathematically exact mute. Do not patch private engine internals casually or claim a subjective timbre fix from waveform metrics.

## Mandatory ideas pass

The exact sole-Claude claude-opus-5-5/high scoped r1 completed with Tool Check PASS and12 anchored sources unchanged. UTC pre-fanout anchor/scope and local-date harness output are both retained in the2026-10-24/2026-10-23 codex-continuous-music-ideas folders; date-bridge-receipt.json explains the discrepancy. Requested/selected model and effort verified; provider runtime identity/quota percentage unknown. Raw quota is private under artifacts and compact review files are redacted. Read judgment.md/final.md before proceeding. No selection-before-code receipt exists because no implementation was selected. No repeat paid r1 is needed for this episode.

Post-restart decision: the same desktop/Android headless diagnostic completed exit0 on unchanged source; the large gaps and idle/earned long tasks did not recur. Native-loop transport changes are deferred. Preserve the source note-boundary concern and physical listening limit; advance the next substantive quest-freedom feature with its own fresh r1. No implementation r3 or new five-gate pass is claimed for this evidence-only diagnosis.

## Controlled post-restart comparison

[
  {
    "name": "desktop",
    "max_zero_ms": {
      "idle": 0.020833333333333332,
      "earned": 0.020833333333333332,
      "resumed": 9.8125
    },
    "quiet_peak": 0,
    "save_bytes": 917,
    "timing": [
      {
        "label": "bass-idle",
        "long_tasks": 0,
        "max_long_task_ms": 0,
        "max_raf_ms": 17
      },
      {
        "label": "earned-idle",
        "long_tasks": 0,
        "max_long_task_ms": 0,
        "max_raf_ms": 17
      },
      {
        "label": "music-resumed",
        "long_tasks": 0,
        "max_long_task_ms": 0,
        "max_raf_ms": 17
      }
    ]
  },
  {
    "name": "android",
    "max_zero_ms": {
      "idle": 0.020833333333333332,
      "earned": 0.020833333333333332,
      "resumed": 0.020833333333333332
    },
    "quiet_peak": 0,
    "save_bytes": 917,
    "timing": [
      {
        "label": "bass-idle",
        "long_tasks": 0,
        "max_long_task_ms": 0,
        "max_raf_ms": 17.100000000000364
      },
      {
        "label": "earned-idle",
        "long_tasks": 0,
        "max_long_task_ms": 0,
        "max_raf_ms": 17
      },
      {
        "label": "music-resumed",
        "long_tasks": 0,
        "max_long_task_ms": 0,
        "max_raf_ms": 17
      }
    ]
  }
]

Observed process exit0, session89287. Earlier roughly500ms stalls were absent from the measured idle/earned windows. This bounded comparison does not identify which environmental factor changed, prove a Windows Update audio fix or close the creator physical-phone report. No transport primitive was run or selected after this new evidence.
