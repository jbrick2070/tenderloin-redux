# Scope Receipt — 2026-10-20-story-surprises-character-ui (r3)

- **Driver**: AGY (`Gemini 4 Argon` High)
- **Lane**: `r3` (single-round review)
- **Requested Partner**: `--driver agy --only claude` (`KIBITZ_CLAUDE_MODEL=claude-opus-5-5`, `KIBITZ_CLAUDE_EFFORT=high`)
- **Changed Files**:
  - `godot/main.gd`
  - `godot/tests/study_test.gd`
- **Scope**:
  1. 10 Neighborhood Surprise Discoveries (`NEIGHBORHOOD_SURPRISE_IDS`, `NEIGHBORHOOD_SURPRISES`, `build_neighborhood_surprises()`, `inspect_neighborhood_surprise()`, `cycle_neighborhood_surprise()` via `Shift+D` or scene tap when not in overview/wide_overview, persisted in `discovered_surprises` in the Godot v1 save envelope):
     - `jeffrey_record` (Jeffrey's Lost 1961 Record beside 361 Turk St)
     - `hidden_mural_145` (The Hidden Mural at 145 Leavenworth St)
     - `impromptu_drag_show` (Surprise Impromptu Drag Show near Taylor & Turk)
     - `viking_dirt_biker` (Random Guy on a Dirt Bike in a Viking Helmet on 200 block of Turk St)
     - `cutesy_dino` (Small Cutesy Sidewalk Dinosaur by Boeddeker Park)
     - `magic_carpet_chef` (Wild Woman Chef on a Magic Carpet on Eddy & Leavenworth)
     - `bite_size_nachos` (Bite-Sized Bags of Sidewalk Nachos on Turk & Taylor)
     - `good_donut_and_bagel` (A Really Good Donut & Everything Bagel on Eddy & Taylor)
     - `clown_horn_walker` (Guy Walking Around with a Clown Horn on Jones & Turk)
     - `mayor_pomp_event` (Impromptu 'Mayor Public Event' & Ribbon Cutting on Eddy & Leavenworth)
  2. Character Talk UI (`apply_character_panel_theme()`, `NEIGHBOR_STORY_BADGES`, `Turn X/5`, `Sparks: N` in `MuralPanel`, `MusicPanel`, and `BlockPanel`).
  3. Feel-Good Engagement & Reward Bursts (`RewardBanner`, 3D `CelebrationBurst`, `spark_count()`, and 3-note rising major-triad / fanfare arpeggio chimes in `trigger_progress_cue()` and `advance_music_clock()`).
