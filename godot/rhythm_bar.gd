extends AudioStreamPlayer
## Original finite hand-drum audition. No recordings, looping or persistence.
const RATE := 22050
const STEP := 0.375
var pattern := 0
var starts := 0
var build_usec := 0
static var hit_template := PackedByteArray()
static var rest_template := PackedByteArray()

static func prepare_template() -> void:
	if not hit_template.is_empty(): return
	var data := PackedByteArray()
	var frames := int(RATE * STEP * 8)
	data.resize(frames * 2)
	for i in range(frames):
		var step := int(float(i) / (RATE * STEP))
		var t := float(i) / RATE - step * STEP
		var attack := minf(t / 0.005, 1.0)
		var tail := maxf(0.0, 1.0 - t / 0.22)
		var phase := TAU * (125.0 * t + 2.4 * (1.0 - exp(-t * 35.0)))
		var value := attack * tail * tail * (sin(phase) * 0.36 + sin(TAU * 430.0 * t) * exp(-t * 60.0) * 0.06)
		data.encode_s16(i * 2, int(round(value * 32767.0)))
	hit_template = data
	rest_template.resize(frames * 2)

static func make_bar(mask: int) -> AudioStreamWAV:
	prepare_template()
	var data := PackedByteArray()
	for step in range(8):
		# Fractional 8268.75-frame boundaries preserve the original PCM exactly.
		var first := int(ceil(step * RATE * STEP)) * 2
		var last := int(ceil((step + 1) * RATE * STEP)) * 2
		data.append_array((hit_template if mask & (1 << step) else rest_template).slice(first,last))
	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = RATE
	wav.stereo = false
	wav.loop_mode = AudioStreamWAV.LOOP_DISABLED
	wav.data = data
	return wav

func setup() -> void:
	prepare_template() # Prepare once before Start Exploring, never inside the first pad press.
	name = "OriginalRhythmBar"
	# Finite PCM uses browser-native samples on Web, avoiding frame-bound stream starvation.
	playback_type = AudioServer.PLAYBACK_TYPE_DEFAULT
	max_polyphony = 1

func start_bar(mask: int) -> void:
	stop()
	var before := Time.get_ticks_usec()
	pattern = mask & 255
	stream = make_bar(pattern)
	build_usec = Time.get_ticks_usec() - before
	starts += 1
	play()

func snapshot() -> Dictionary:
	return {"playing":playing,"pattern":pattern,"starts":starts,"position":get_playback_position() if playing else 0.0,"seconds":stream.get_length() if stream != null else 0.0,"build_usec":build_usec,"gain":volume_db,"frames":stream.data.size()/2 if stream != null else 0}
