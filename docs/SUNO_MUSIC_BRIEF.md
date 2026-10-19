# A warmer soundtrack — creator's local music workflow

The creator called the synth sketch lackluster and asked about using jazz tracks they generate in Suno. Version 0.4.0 adds **Choose music** below the map. Select a downloaded MP3/WAV (up to 100 MB), then Play. It repeats the selected track, with pause/resume and the game's music volume. Choose another file to replace it, or Return to synth sketch. One track at a time; this is not a playlist/stem system.

The file is a browser-local object URL, never uploaded, copied into the repository, included in game saves or retained after reload. Choose it again when returning. Reload starts silently with the original sketch available. The selected track plays as a full recording; task completion does not remix or unlock its instruments, so the synth stem labels hide in local-track mode. Every activity still works silently.

## Start with one good track

Use an original instrumental composition with a restrained, human-feeling small group. Try this first:

> Instrumental small-combo jazz. Warm muted trumpet, woody upright bass, brushed drums, intimate piano voicings. Relaxed 84 BPM swing, playful syncopation, bluesy turns, generous space between phrases. A hopeful San Francisco neighborhood afternoon: friendly, soulful, a little gritty, quietly joyful. Natural dynamics and loose human timing. Memorable original motif, evolving improvisation, no vocals. Gentle opening and ending suitable for repeat listening.

Two possible later moods, only if the first track feels good:

- **The gathering opens:** instrumental jazz quintet, 98 BPM, warm trumpet and tenor call-and-response, lively brushed/small-stick drums, acoustic bass, piano, celebratory neighborhood block-party energy, room to hear conversation, short original melodic hooks, no vocals.
- **A little head nod:** instrumental jazz and hip-hop, 88 BPM, swung dusty drums created for this track, upright bass, Rhodes, restrained muted trumpet, an optimistic loose pocket, warm acoustic detail, original composition with no borrowed samples, no vocals.

These are creative briefs, not claims about Suno's ability to produce clean loop points or a specific result. Start with one track to conserve generation/download credits. Listen for a convincing groove, musical development and comfortable repeated listening before making more. Do not request a particular recording, melody, solo or performer imitation. No track was generated or audibly evaluated in this implementation round. Browser playback tests use a quiet synthetic tone only.

## Source and release provenance

Checked official Suno sources on 2026-10-18. The [download FAQ, edited August 10, 2026](https://help.suno.com/en/articles/13614785) describes free trial downloads as personal/noncommercial and permitted paid-subscriber downloads as carrying commercial-use rights. The [terms effective September 3, 2026](https://suno.com/terms) govern permitted downloads and include separate limitations for remixes. Keep the downloaded file's track ID/link, creator, generation/download dates, plan, and relevant rights terms before considering it for a distributed game build. This local player neither determines rights nor grants a license; importing and shipping chosen audio is a later provenance decision. No Suno login, API integration, download, purchase or media import occurred here.
