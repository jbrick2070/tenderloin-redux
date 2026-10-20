# Driver anchor before independent CLI review

VERDICT: yes-with-verification.

CONFIRMED: soundtrack-independent PCM is bounded to 0.75s/33076 bytes, single player, no loop, with low-amplitude sine notes and attack/release. Real input unlock is observed before Controls consume events. Only reward-bearing cues enter the sound player, under suppression; import/audition do not sound.

CONFIRMED: settings carry reward_sounds independently of gameplay save. Preference writes retain Neighborhood Voices. Loading and scene construction do not play sounds. Existing synth cue mixing was removed.

CONFIRMED: explicit Start acceptance frames actual player, preserves state and location, and keeps Map Overview. Later chapter cards only dismiss. Header now retains Sparks and keepsakes across panels; phone names/turns/Sparks are shortened.

MUST VERIFY: all five gates after final fixes; actual browser toggle and start hit targets at 1100/390/320, save reload, visible avatar, nonempty progress, absent errors/external requests. Headless tests cannot prove device playback or listening quality.

Initial native tests found a latent world-tap fixture with an undismissed chapter card; larger header moved that card across the test tap. Explicitly dismiss in world-tap precondition. Negative guide-arrow inner rectangle with very small play area was fixed with a size guard. Retain initial logs.

UNVERIFIABLE: human listening comfort, physical phone, full screen reader experience and field accuracy. No claim of those.
