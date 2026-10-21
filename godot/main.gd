extends Node3D
## Measured-building Tenderloin neighborhood with actual-metre walking, footprint/courtyard
## collision across 188 DataSF footprints (58 opening block + 130 wider Tenderloin),
## 7 ODbL OSM streets (Turk, Taylor, Mason, Jones, Leavenworth, Hyde, Eddy),
## Transgender Cultural District boundary layer (DataSF 5xmc-5bjj, PDDL 1.0, founded 2017),
## Compton's Corner & Former Black Hawk Jazz Club history stops, Celeste's portable mural board,
## Rook's soundcheck + procedural/local music, opening-block completion, M1 keepsake photo &
## loan returns, M3 second-afternoon programme planning & hosting, and browser-save adapter.

const WALK_SPEED_M_PER_S := 4.8
const WALK_CORRIDOR_SPEED_M_PER_S := 24.0
const PLAYER_HEIGHT_M := 1.72
const PLAYER_RADIUS_M := 0.45
const CHARACTER_VISUAL_SCALE := 2.15
const CHARACTER_SHADOW_GROUND_Y := 0.075
const WALK_CLEARANCE_M := 0.65
const MAX_STREET_CORRIDOR_M := 12.0
const ARRIVAL_DISTANCE_M := 1.35
const CUTAWAY_RADIUS_M := 4.0
const CAMERA_OFFSET := Vector3(180.0, 180.0, 180.0)
const PLAYER_START := Vector3(17.74, 0.0, -9.33)
const MURAL_POS := Vector3(76.50, 0.0, -18.70)
const MURAL_BOARD_COLS := 6
const MURAL_BOARD_ROWS := 3
const CELESTE_ID := "celeste"
const ROOK_ID := "rook"
const ROOK_SPEAKER_POS := Vector3(117.10, 0.0, -15.95)
const BLOCK_BANNER_OFFSET := Vector3(0.0, 0.0, -0.55)
const COMPTONS_POS := Vector3(-6.0, 0.0, -5.5)
const BLACKHAWK_POS := Vector3(-424.5, 0.0, 62.5)
const HISTORY_STOP_IDS: Array[String] = ["comptons", "blackhawk"]
const MURAL_HALF_EXTENTS := Vector2(1.78, 0.18)
const SPEAKER_HALF_EXTENTS := Vector2(0.34, 0.28)
const GODOT_SAVE_PATH := "user://godot_block_save_v1.json"
const GODOT_TEST_SAVE_PATH := "user://godot_block_save_test_v1.json"
const GODOT_WEB_STORAGE_KEY := "tenderloin-redux.godot.save.v1"
const BROWSER_WEB_STORAGE_KEY := "tenderloin-redux.save.v1"
const BROWSER_SAVE_MAX_BYTES := 65536
const BROWSER_FURNITURE_IDS: Array[String] = ["table", "seats", "speaker"]
const BROWSER_LITTER_IDS: Array[String] = ["cup", "offcuts", "wrapper"]
const GODOT_SAVE_VERSION := 1
const MURAL_PALETTES: Array[String] = ["garden", "sunset", "ocean"]
const MURAL_MOTIFS: Array[String] = ["sun", "wave", "rise"]
const MURAL_DEFAULT_CELLS: Dictionary = {
	"sun": Vector2i(1, 0),
	"wave": Vector2i(3, 1),
	"rise": Vector2i(5, 2)
}
const PHOTO_GUESTS: Array[String] = ["bea", "celeste", "dez", "thanh"]
const KEEPSAKE_EXPORT_FILENAME := "tenderloin-redux-godot-afternoon.svg"
const KEEPSAKE_PALETTE_HEX: Dictionary = {
	"garden": ["#c37e71", "#276a5a", "#d6a449"],
	"sunset": ["#cb7752", "#975a7c", "#dfb75f"],
	"ocean": ["#508a9b", "#28665f", "#d3ab77"]
}
const KEEPSAKE_BUNTING_Y: Array[String] = [
	"72", "79.5657117545147", "86.75204712999698", "93.19865326319695",
	"98.58227040391301", "102.63294150868225", "105.147549014182", "106",
	"105.147549014182", "102.63294150868225", "98.58227040391301", "93.19865326319695",
	"86.75204712999698", "79.5657117545147", "72"
]
const LOAN_IDS: Array[String] = ["table", "paint-case", "speaker"]
const LOAN_OWNERS: Dictionary = {"table": "thanh", "paint-case": "celeste", "speaker": "rook"}
const TALK_PROMPT_RADIUS_M := 6.0
const GATHERING_LAYOUTS: Array[String] = ["table", "floor"]
const GATHERING_LAYOUT_TITLES: Dictionary = {"table": "Long Table", "floor": "Open Floor"}
# Story chapters follow docs/CONCEPT.md: a fictional resident helping co-host a gathering that
# neighbors already started, then the afternoon projects that grow out of it.
const STORY_CHAPTERS: Array[Dictionary] = [
	{"num": 1, "title": "Get the Block Ready", "intro": "An afternoon at Turk & Taylor. You live on this block, and your neighbors have already started planning a small gathering. Bea has a plan, Celeste brought paint, Rook knows sound, Dez has a beat, and Thanh is lending supplies. Help them get the block ready. The gathering and the neighbors are fictional; the streets and the history are real."},
	{"num": 2, "title": "The Gathering", "intro": "The block is open. Take a group photo with whoever wants to be in it, then help give back what was borrowed."},
	{"num": 3, "title": "Another Afternoon", "intro": "Your neighbors want to do it again. Plan the schedule together, then host it: stories, rhythm, shared art, and a quiet pause."},
	{"num": 4, "title": "A Listening Hour", "intro": "Some neighbors want to talk about repairs and shared space. Help set up a peaceful listening circle where everyone gets heard."},
	{"num": 5, "title": "The Open Seat", "intro": "Celeste and Dez want to make a tiny three-shot film about keeping a seat open for someone new."},
	{"num": 6, "title": "Your Block", "intro": "Everything you started is part of the block now. Wander, revisit the history stops, or just stop and say hi."}
]
const LOAN_TITLES: Dictionary = {
	"table": "Thanh's folding table",
	"paint-case": "Celeste's paint case",
	"speaker": "Rook's speaker"
}
const PROGRAMME_SEGMENTS: Array[String] = ["stories", "beats", "art", "pause"]
const PROGRAMME_DEFAULT_ORDER: Array[String] = ["stories", "beats", "pause", "art"]
const PROGRAMME_TITLES: Dictionary = {
	"stories": "Story circle",
	"beats": "Rhythm workshop",
	"art": "Shared art panel",
	"pause": "Quiet interval"
}
const PROGRAMME_SEGMENT_COLORS: Dictionary = {
	"stories": "#e5b66d",
	"beats": "#91bac2",
	"art": "#d9a2b2",
	"pause": "#a3b48c"
}
const HOSTING_STORIES: Array[String] = ["memory", "future"]
const HOSTING_PALETTES: Array[String] = ["warm", "cool"]
const HOSTING_TILE_HEX: Dictionary = {
	"warm": ["#e5b66d", "#d9a2b2", "#75907c"],
	"cool": ["#91bac2", "#a3b48c", "#987b9e"]
}
const HOSTING_QUIETS: Array[String] = ["arc", "pairs"]
const HOSTING_DEFAULT_TILES: Array[int] = [0, 1, 2, 2, 1, 0]
const SAVE_BUDGET_MAX_BYTES := 4096
const PATHFIND_BUDGET_MAX_USEC := 250000
const SAVE_SERIALIZE_BUDGET_MAX_USEC := 50000
const VOICES_TEARDOWN_BUDGET_MAX_USEC := 50000
const GODOT_SETTINGS_PATH := "user://godot_block_settings_v1.json"
const GODOT_TEST_SETTINGS_PATH := "user://godot_block_settings_test_v1.json"
const GODOT_SETTINGS_WEB_STORAGE_KEY := "tenderloin-redux.godot.settings.v1"
const CIVIC_TOPICS: Array[String] = ["repairs", "access"]
const CIVIC_TOPIC_LABELS: Dictionary = {
	"repairs": "Repairs and staying put",
	"access": "Room to come and go"
}
const CIVIC_TOPIC_REQUESTS: Dictionary = {
	"repairs": "We want homes cared for and neighbors able to stay. We ask for a conversation about repairs without displacement.",
	"access": "We want shared spaces that welcome neighbors while keeping entrances and the through-route clear."
}
const CIVIC_FORMATS: Array[String] = ["circle", "dropin"]
const CIVIC_FORMAT_LABELS: Dictionary = {
	"circle": "Small listening circle",
	"dropin": "Drop-in notice table"
}
const CIVIC_NOTES: Array[String] = ["themes", "none"]
const CIVIC_NOTE_LABELS: Dictionary = {
	"themes": "Keep anonymous themes",
	"none": "Keep no meeting notes"
}
const CIVIC_PHASES: Array[String] = ["idle", "planning", "meeting", "done"]
const FILM_SHOTS: Array[String] = ["seat", "paint", "welcome"]
const FILM_SHOT_LABELS: Dictionary = {
	"seat": "An empty seat",
	"paint": "A shared motif",
	"welcome": "Room for one more"
}
const FILM_SHOT_QUIET_CAPTIONS: Dictionary = {
	"seat": "A chair waits. There is room for someone new.",
	"paint": "A neighbor's shape becomes part of something shared.",
	"welcome": "A place stays open. Joining in is an invitation."
}
const FILM_SHOT_LATER_CAPTIONS: Dictionary = {
	"seat": "\"May I sit here?\" \"We kept a place open.\"",
	"paint": "\"Your shape belongs beside mine.\"",
	"welcome": "\"Stay for a moment, or come back another day.\""
}
const FILM_FRAMING: Array[String] = ["close", "wide"]
const FILM_FRAMING_LABELS: Dictionary = {
	"close": "Objects in close-up",
	"wide": "Table and volunteer hands"
}
const FILM_PLANS: Array[String] = ["quiet", "later"]
const FILM_PLAN_LABELS: Dictionary = {
	"quiet": "A quiet prop take",
	"later": "Wait for the conversation"
}
const FILM_PHASES: Array[String] = ["idle", "planning", "hold", "shooting", "done"]
const VOICES_DATA_PATH := "res://data/neighborhood_voices.json"
const VOICES_CHECKED_AT := "2026-10-18"
const VOICES_DISCLAIMER := "Sources checked October 18, 2026. This is a dated introduction, not a current service or emergency directory. Follow the official pages for current information. No organization endorses or assigns missions in this game. \"Neighborhood Voices\" is the feature's name; this version contains no recorded voices."
const VOICES_MAX_BYTES := 8192
const OPTIONAL_SAVE_MAX_BYTES := 8192
const VOICES_SOURCES: Dictionary = {
	"tndc": "https://www.tndc.org/about",
	"glide": "https://www.glide.org/programs/",
	"larkin": "https://larkinstreetyouth.org/about/"
}
const MUSIC_STEM_ORDER: Array[String] = ["bass", "brush", "chords", "lead"]
const MUSIC_VOL_STEPS: Array[float] = [0.70, 1.0, 0.35, 0.0]
const MUSIC_MIX_RATE := 22050.0
const MUSIC_STEP_SEC := 0.375
const MUSIC_MAX_LOCAL_BYTES := 40 * 1024 * 1024
const MUSIC_DECODE_ERROR := "Could not decode audio file. Sketch remains available."
const MUSIC_FILE_ERROR := "Invalid audio file. Choose an MP3, WAV, or OGG track."
const ROOFTOP_DETAIL_NODE := "RooftopDetails"
const CORNER_TOWER_MIN_HEIGHT_M := 15.0
const CORNER_TOWER_MAX_CORNER_DIST_M := 15.0
const TROLLEY_STREET_NAMES: Array[String] = ["Turk Street", "Eddy Street"]
const TROLLEY_POLE_SPACING_M := 30.0
const TROLLEY_POLE_OFFSET_M := 6.1
const TROLLEY_WIRE_HEIGHT_M := 5.8
const TROLLEY_SPAN_HEIGHT_M := 6.4
const TROLLEY_WIRE_OFFSETS_M: Array[float] = [1.15, 1.75]
# Boeddeker Park outline: OpenStreetMap way 33619301 (240 Eddy St), (c) OpenStreetMap contributors, ODbL 1.0.
# Projected with the data/buildings.json local-metre origin; raw response kept in data/source/boeddeker_park.osm.json.
const BOEDDEKER_PARK_OSM_WAY := 33619301
const BOEDDEKER_PARK_RING: Array[Vector2] = [
	Vector2(-159.26, -133.90), Vector2(-156.52, -113.06), Vector2(-154.53, -101.81), Vector2(-153.44, -98.92),
	Vector2(-150.94, -96.64), Vector2(-146.34, -95.10), Vector2(-112.12, -99.50), Vector2(-109.18, -99.87),
	Vector2(-109.17, -103.45), Vector2(-106.82, -103.49), Vector2(-107.37, -110.23), Vector2(-95.89, -112.85),
	Vector2(-99.84, -137.94), Vector2(-90.14, -139.80), Vector2(-90.85, -144.69), Vector2(-75.72, -146.91),
	Vector2(-82.38, -189.51), Vector2(-86.92, -188.63), Vector2(-90.68, -187.95), Vector2(-106.20, -185.20),
	Vector2(-99.33, -143.69)
]
const BOEDDEKER_PARK_ENTRANCE := Vector2(-126.0, -97.7)
const BOEDDEKER_VIEW_TARGET := Vector3(-118.0, 2.0, -132.0)
const SPEECH_BUBBLE_PIXEL := 0.0024
const SPEECH_BUBBLE_FONT := 24
const SPEECH_BUBBLE_HEIGHT_M := 5.0
const SPEECH_BUBBLE_HIDE_TARGET_DIST_M := 45.0
const GUIDE_MARKER_LIFT_LOW := 4.6
const GUIDE_MARKER_LIFT_HIGH := 6.6
const STREET_TREE_DATA_PATH := "res://data/street_trees.json"
const LIDAR_DATA_PATH := "res://data/lidar_2023.json"
const CURRENT_BUILDINGS_NODE := "CurrentBuildings"
const LIDAR_STOREY_M := 3.2
# The creator's building, TL Residences at 145 Leavenworth (OSM way 1258857968). From the creator's
# own photo: 9 window rows above the storefront under the "TL145" sign; the creator's apartment is
# the 8th row, in the upper-left (south) bay of the front facade; the entrance is at the north end.
const TL145_ADDRESS := "145 Leavenworth Street"
const TL145_PHOTO_ROWS := 9
const TL145_STOREFRONT_M := 4.2
const TL145_CREATOR_ROW := 8
const TL145_LEFT_BAY_M := 2.6
const TL145_ENTRANCE_M := 2.2
# Across Leavenworth: 140-156 Leavenworth (OSM way 260155578) holds Compass Children's Center
# (OSM node 11702308291), whose canopy-covered rooftop playground the creator described.
const COMPASS_ROOF_ID := "201006.0010611"
const DAY_LIGHT_POOL_ALPHA := 0.28
const EATERY_HOST_LINES: Dictionary = {
	"bowl_basil_pho": [
		"Welcome in! The broth has been simmering since sunrise. Pull up a stool.",
		"One lemongrass beef pho, extra basil and lime, coming right up.",
		"Crispy imperial rolls just came out of the fryer. Careful, they're hot!"
	],
	"saffron_clay_oven": [
		"Hello, neighbor! The clay oven is roaring. Garlic naan in two minutes.",
		"Smoky chana masala and a mango lassi for you. Enjoy!",
		"We stay open late for the night-shift crowd. Come back anytime."
	],
	"blue_valve_hifi": [
		"Evening! The tube amp is warm and a live 1961 jazz set is on the platter.",
		"A zero-proof botanical highball, shaken. Listen to that upright bass.",
		"Requests welcome. Every record behind this bar has a neighborhood story."
	],
	"morning_star_banh_mi": [
		"Good morning! The baguettes just came out crackling hot.",
		"Pickled daikon, carrot, jalapeno, cilantro. And a condensed-milk iced coffee.",
		"Thanh lends us folding stools for block parties. Neighbors look out for each other."
	],
	"copper_cue_tavern": [
		"Rack 'em up! The neighborhood pool table is open.",
		"A cold draft for you, and the jukebox is cued to soul 45s.",
		"Our neon sign lights up the whole corner every evening."
	],
	"open_seat_diner": [
		"Counter seats are open. Sourdough griddle cakes?",
		"Hash browns, extra crispy, and a warm slice of olallieberry pie.",
		"Refill on coffee? We keep the pot on for the night owls."
	]
}
const EATERY_MENU_ITEMS: Dictionary = {
	"bowl_basil_pho": ["lemongrass beef pho", "mushroom pho", "imperial rolls"],
	"saffron_clay_oven": ["garlic naan", "chana masala", "mango lassi"],
	"blue_valve_hifi": ["botanical highball", "1961 live jazz LP", "neighborhood cocktail"],
	"morning_star_banh_mi": ["banh mi", "condensed-milk iced coffee", "pickled daikon side"],
	"copper_cue_tavern": ["cold draft", "rack of pool", "soul 45 on the jukebox"],
	"open_seat_diner": ["sourdough griddle cakes", "hash browns", "olallieberry pie"]
}
const MUSEUM_DOCENT_LINES: Array[String] = [
	"Welcome to the Tenderloin Museum! Tap again and the Time-Portal will take us back.",
	"1961: Miles Davis played the Black Hawk at Turk & Hyde, just down the street.",
	"1966: at Compton's Cafeteria, trans women and neighbors stood up for each other.",
	"1907: the Cadillac Hotel opened right here as the city rebuilt after the quake."
]
const NEIGHBORHOOD_SURPRISE_IDS: Array[String] = [
	"jeffrey_record",
	"hidden_mural_145",
	"impromptu_drag_show",
	"viking_dirt_biker",
	"cutesy_dino",
	"magic_carpet_chef",
	"bite_size_nachos",
	"good_donut_and_bagel",
	"clown_horn_walker",
	"mayor_pomp_event"
]
const NEIGHBORHOOD_SURPRISES: Dictionary = {
	"jeffrey_record": {
		"title": "Jeffrey's Lost 1961 Record",
		"badge": "Secret Vinyl Find",
		"street": "361 Turk St sidewalk (beside the 'So What' awning)",
		"speaker": "Rook",
		"speech": "Hold up—that's Jeffrey's lost 1961 'Live at the Black Hawk' LP sleeve tucked in the cedar crate by 361 Turk! Wait till the 8th floor hears we found it.",
		"summary": "Found Jeffrey's lost 1961 Black Hawk vinyl pressing in the cedar crate beside the 361 Turk St 'So What' awning (fictional neighborhood story moment).",
		"pos": Vector3(-376.2, 0.0, 62.4),
		"accent": "f8cc58"
	},
	"hidden_mural_145": {
		"title": "The Hidden Mural at 145 Leavenworth",
		"badge": "Courtyard Art Discovery",
		"street": "145 Leavenworth St frontage (below the 8th-floor bay)",
		"speaker": "Celeste",
		"speech": "Look tucked beside the 145 Leavenworth archway—a painted courtyard triptych of golden horns, bay windows, and night-blooming jasmine!",
		"summary": "Spotted the hidden mural alcove at 145 Leavenworth below the 8th-floor turntable window (fictional story artwork on the real TL145 frontage).",
		"pos": Vector3(-284.5, 0.0, 95.8),
		"accent": "5fd4ba"
	},
	"impromptu_drag_show": {
		"title": "Surprise Impromptu Drag Show!",
		"badge": "Sidewalk Encore",
		"street": "Taylor & Turk (Transgender Cultural District)",
		"speaker": "Starlight",
		"speech": "Two-step on the velvet runner, darling! When Taylor and Turk light up, every sidewalk is a main stage!",
		"summary": "Cheered a joyful impromptu sidewalk drag encore near Compton's Corner in the Transgender Cultural District (fictional celebration on the real corner).",
		"pos": Vector3(-8.5, 0.0, -18.5),
		"accent": "f5a3d0"
	},
	"viking_dirt_biker": {
		"title": "Random Guy on a Dirt Bike in a Viking Helmet",
		"badge": "Street Legend Sighting",
		"street": "200 block of Turk St (between Jones & Leavenworth)",
		"speaker": "Viking Rider",
		"speech": "Skol, neighbor! Just cruising Turk Street at an easy idle—horns polished, helmet strapped, waving hello to the whole block party!",
		"summary": "Spotted a friendly random guy idling on a dirt bike wearing a horned Viking helmet on the 200 block of Turk St (fictional Tenderloin street moment).",
		"pos": Vector3(-218.0, 0.0, 39.2),
		"accent": "ffb35c"
	},
	"cutesy_dino": {
		"title": "Small Cutesy Sidewalk Dinosaur",
		"badge": "Tiny Prehistoric Pal",
		"street": "Eddy & Jones sidewalk (by Boeddeker Park)",
		"speaker": "Pip the Tiny Dino",
		"speech": "Rawr-chirp! Just waddling past Boeddeker Park for a sunny leaf snack and a tiny stubby-arm wave to the whole block!",
		"summary": "Met a small cutesy pastel-mint dinosaur doing happy little hops by Boeddeker Park (fictional whimsical neighborhood surprise).",
		"pos": Vector3(-148.0, 0.0, -52.0),
		"accent": "7ce8b0"
	},
	"magic_carpet_chef": {
		"title": "Wild Woman Chef on a Magic Carpet",
		"badge": "Flying Culinary Legend",
		"street": "Eddy & Leavenworth corridor",
		"speaker": "Chef Zafira",
		"speech": "Hold onto your taste buds, honey! When the star anise, garlic, and lemongrass hit the wok, this woven carpet lifts right off the sidewalk!",
		"summary": "Watched a wild woman chef in a tall white toque soar above the sidewalk on a fringed crimson-and-gold magic carpet (fictional whimsical neighborhood surprise).",
		"pos": Vector3(-258.0, 0.0, -34.0),
		"accent": "ff7b9c"
	},
	"bite_size_nachos": {
		"title": "Bite-Sized Bags of Sidewalk Nachos",
		"badge": "Crunchy Corner Snack",
		"street": "Turk & Taylor sidewalk",
		"speaker": "Nacho Captain Rico",
		"speech": "Grab a bite-sized bag of warm tortilla chips with a little cup of roasted salsa verde—just enough crunch to keep you strolling!",
		"summary": "Found a sunny crate of bite-sized bags of nachos and salsa verde cups shared on the Turk & Taylor sidewalk (fictional neighborhood snack moment).",
		"pos": Vector3(-64.0, 0.0, 18.0),
		"accent": "ffb84d"
	},
	"good_donut_and_bagel": {
		"title": "A Really Good Donut & Everything Bagel",
		"badge": "Warm Bakery Treat",
		"street": "Eddy & Taylor sidewalk",
		"speaker": "Baker Mae",
		"speech": "Still warm from the rack! Take a pink-frosted glazed donut or a toasted everything bagel with whipped scallion cream cheese—or half of each!",
		"summary": "Shared a freshly glazed pink-sprinkle donut and a toasted everything bagel on the Eddy & Taylor sidewalk (fictional bakery treat moment).",
		"pos": Vector3(18.0, 0.0, -56.0),
		"accent": "ff9ec4"
	},
	"clown_horn_walker": {
		"title": "Guy Walking Around with a Clown Horn",
		"badge": "Honk-Honk Stroller",
		"street": "Jones & Turk sidewalk",
		"speaker": "Honker Barnaby",
		"speech": "Honk-honk! Just keeping the sidewalk smiling—two gentle squeezes on the red rubber bulb right on Dez's 80 BPM downbeat!",
		"summary": "Met a cheerful guy strolling along Jones & Turk squeezing a brass-and-red-bulb clown horn in time with the block groove (fictional street character moment).",
		"pos": Vector3(-124.0, 0.0, 18.0),
		"accent": "ff6b6b"
	},
	"mayor_pomp_event": {
		"title": "Impromptu 'Mayor Public Event' & Ribbon Cutting",
		"badge": "A Little Pomp & Circumstance",
		"street": "Eddy & Leavenworth plaza corner",
		"speaker": "The Block Mayor",
		"speech": "Ahem—by the power vested in this tiny velvet podium and oversized golden scissors, I hereby proclaim today Official Neighbor Appreciation Hour! Cue the fanfare!",
		"summary": "Joined an impromptu 'Mayor Public Event' complete with a miniature podium, velvet rope stanchions, oversized golden ribbon-cutting scissors, and a little pomp and circumstance (fictional civic comedy moment).",
		"pos": Vector3(-296.0, 0.0, -52.0),
		"accent": "ffd45e"
	}
}
const NEIGHBOR_STORY_BADGES: Dictionary = {
	"bea": "Block Organizer · Warm & Steady",
	"celeste": "Sidewalk Muralist · Bright & Inviting",
	"rook": "Sound Keeper · Cool & Observant",
	"dez": "80 BPM Beatmaker · Easygoing Groove",
	"thanh": "Tea & Stools Host · Generous & Calm"
}
const NEIGHBOR_SURPRISE_PAIRS: Dictionary = {
	"bea": ["mayor_pomp_event", "good_donut_and_bagel"],
	"celeste": ["hidden_mural_145", "cutesy_dino"],
	"rook": ["jeffrey_record", "clown_horn_walker"],
	"dez": ["viking_dirt_biker", "magic_carpet_chef"],
	"thanh": ["impromptu_drag_show", "bite_size_nachos"]
}
const SURPRISE_KEEPSAKE_META: Dictionary = {
	"jeffrey_record": {"neighbor": "rook", "node": "JeffreyRecordTurntable", "label": "Jeffrey's 1961 LP on Rook's speaker"},
	"clown_horn_walker": {"neighbor": "rook", "node": "BarnabyClownHornClip", "label": "Barnaby's clown horn on Rook's speaker"},
	"hidden_mural_145": {"neighbor": "celeste", "node": "HiddenMuralSketchCard", "label": "145 Leavenworth sketch on Celeste's easel"},
	"cutesy_dino": {"neighbor": "celeste", "node": "PipDinoMascot", "label": "Pip the Tiny Dino on Celeste's easel"},
	"mayor_pomp_event": {"neighbor": "bea", "node": "MayorRibbonRosette", "label": "Golden ribbon rosette on Bea's walker"},
	"good_donut_and_bagel": {"neighbor": "bea", "node": "BakeryTreatBox", "label": "Mae's donut & bagel box on Bea's walker"},
	"viking_dirt_biker": {"neighbor": "dez", "node": "VikingHornCharm", "label": "Mini Viking badge on Dez's notebook"},
	"magic_carpet_chef": {"neighbor": "dez", "node": "ZafiraSpiceCarpet", "label": "Chef Zafira's mini carpet beside Dez"},
	"impromptu_drag_show": {"neighbor": "thanh", "node": "StarlightRunwayCrown", "label": "Starlight's fan & tiara on Thanh's crate"},
	"bite_size_nachos": {"neighbor": "thanh", "node": "RicoMiniNachoBag", "label": "Rico's mini nacho bag on Thanh's crate"}
}
# Field Guide survey tags (tools/field-guide/) -> facade colors and architectural flags.
# Keep in sync with BUILDING_TAGS in scripts/apply-field-survey.mjs.
const FIELD_SURVEY_TAG_STYLES: Dictionary = {
	"Red Brick": {"base": "9c4a3a", "spandrel": "7e3a2e"},
	"Buff/Tan Brick": {"base": "c9a67a", "spandrel": "a8865e"},
	"Cream Stucco": {"base": "e8dcc0", "spandrel": "cfc2a4"},
	"Sage/Teal Paint": {"base": "6f9a8b", "spandrel": "557a6d"},
	"Terracotta Ornate Trim": {"cornice": "b8643f"},
	"Angled Bay Windows": {"force_bays": true},
	"Rounded Bay Windows": {"force_bays": true},
	"Sloped Fabric Awning": {"force_awning": true},
	"Flat Metal Marquee": {"force_awning": true, "flat_marquee": true},
	"Vertical Neon Blade Sign": {"neon_blade": true},
	"Iron Fire Escape": {"force_fire_escape": true},
	"Arched Mezzanine Windows": {"mezzanine": true},
	"Painted Wall Mural": {"plinth": "b5577a"},
	"Rooftop Water Tank": {"roof_water_tank": true},
	"Elevator Penthouse": {"roof_penthouse": true},
	"Skylights": {"roof_skylights": true}
}
# BEGIN FIELD_SURVEY_OVERRIDES (generated by scripts/apply-field-survey.mjs from a Field Guide export; edit the survey, not this block)
const FIELD_SURVEY_SOURCE := ""
const FIELD_SURVEY_OVERRIDES: Dictionary = {}
# END FIELD_SURVEY_OVERRIDES
const BOEDDEKER_PATH_POINTS: Array[Vector2] = [
	Vector2(-126.0, -98.6), Vector2(-126.5, -114.0), Vector2(-112.0, -125.5),
	Vector2(-95.5, -141.5), Vector2(-90.5, -160.0), Vector2(-91.0, -180.0)
]

var data: Dictionary
var camera: Camera3D
var meshes: Array[MeshInstance3D] = []
var building_rects: Array[Rect2] = []
var building_materials: Array[Material] = []
var wider_meshes: Array[MeshInstance3D] = []
var wider_building_rects: Array[Rect2] = []
var wider_building_materials: Array[Material] = []
var all_buildings: Array = []
var all_building_rects: Array[Rect2] = []
# Current outlines for walking and collision: the 2010 footprints minus those a newer building has
# replaced, plus the additions from data/lidar_2023.json. all_buildings stays the 188 city records.
var current_buildings: Array = []
var current_building_rects: Array[Rect2] = []
var walk_building_bins: Dictionary = {}
const WALK_BUILDING_BIN_M := 32.0
const WALK_BUILDING_INDEX_CLEARANCE_M := 1.0
const WALK_CELL_EXTRA_CLEARANCE_M := 0.15
var lidar_source: Dictionary = {}
var lidar_roofs: Dictionary = {}
var lidar_superseded: Dictionary = {}
var lidar_additions: Array = []
var addition_meshes: Array[MeshInstance3D] = []
var addition_rects: Array[Rect2] = []
var addition_materials: Array[Material] = []
var occluded_additions: Array[int] = []
var street_ways: Array = []
var street_way_rects: Array[Rect2] = []
var walk_bounds := Rect2(-40.0, -65.0, 210.0, 140.0)
var selected := -1
var info: RichTextLabel
var target := Vector3(65, 0, -12)
var view_size := 250.0
var wall_material: StandardMaterial3D
var chosen_material: StandardMaterial3D
var cutaway_material: StandardMaterial3D
var controls: GridContainer
var next_hint_control: Button
var map_control: Button
var zoom_in_control: Button
var zoom_out_control: Button
var walk_control_press_handled := false
var walk_control: Button
var header_panel: PanelContainer
var overview_size := 400.0
var in_overview := true
var in_wide_overview := false

var player: CharacterBody3D
var player_visual: Node3D
var neighbors: Array[Dictionary] = [
	{"id": "bea", "name": "Bea", "role": "The one with the plan", "pos": Vector3(22.09, 0.0, -10.03), "coat": Color("c5874f"), "skin": Color("966345"), "hair": Color("dad7c6")},
	{"id": "celeste", "name": "Celeste", "role": "Signs, paint & possibility", "pos": Vector3(70.07, 0.0, -17.75), "coat": Color("c87d82"), "skin": Color("8b5b3f"), "hair": Color("383c32")},
	{"id": "rook", "name": "Rook", "role": "Good ears. Better stories.", "pos": Vector3(114.71, 0.0, -14.79), "coat": Color("547a79"), "skin": Color("a97650"), "hair": Color("3f352c")},
	{"id": "dez", "name": "Dez", "role": "Always making a beat", "pos": Vector3(126.74, 0.0, -26.86), "coat": Color("978aaf"), "skin": Color("704b37"), "hair": Color("292f2b")},
	{"id": "thanh", "name": "Thanh", "role": "Neighbor & supply lender", "pos": Vector3(11.10, 0.0, 24.97), "coat": Color("b59b5d"), "skin": Color("c38c65"), "hair": Color("454236")}
]
var neighbor_nodes: Array[Node3D] = []
var celeste_index := 1
var rook_index := 2
var route_mesh: MeshInstance3D
var selected_neighbor := -1
var arrived_neighbor := -1
var walking_to_mural := false
var arrived_mural := false
var pending_celeste_talk := false
var walking_to_speaker := false
var arrived_speaker := false
var pending_rook_talk := false
var walking_to_history_stop := ""
var arrived_history_stop := ""
var current_path: Array[Vector2] = []
var occluded_buildings: Array[int] = []
var occluded_wider_buildings: Array[int] = []
var following_player := false
var cell_walkable_cache: Dictionary = {}
var last_astar_expanded_cells := 0
var last_occlusion_pos := Vector2(INF, INF)
var last_occlusion_neighbor := -2
var last_ribbon_pos := Vector2(INF, INF)
var last_ribbon_count := -1
var pointer_active := false
var pointer_dragging := false
var pointer_down_pos := Vector2.ZERO
var pointer_last_pos := Vector2.ZERO

var mural_node: Node3D
var mural_canvas_mesh: MeshInstance3D
var mural_motif_nodes: Dictionary = {}
var mural_banner_mesh: MeshInstance3D
var mural_panel: PanelContainer
var mural_label: Label
var mural_detail_label: RichTextLabel
var mural_buttons: Array[Button] = []
var mural_palette_btn: Button
var mural_sun_btn: Button
var mural_wave_btn: Button
var mural_rise_btn: Button
var save_path := GODOT_SAVE_PATH
var save_seq := 0
var celeste_talk_count := 0
var active_motif := "sun"
var mural_palette := "garden"
var mural_placements: Dictionary = {}
var mural_completed := false
var save_load_status := "fresh"

var speaker_node: Node3D
var speaker_cone_mesh: MeshInstance3D
var speaker_beacon_mesh: MeshInstance3D
var rook_soundcheck_done := false
var rook_talk_count := 0
var neighbor_talk_counts: Dictionary = {}
var last_panel_dialogue := ""
var visited_neighbors: Dictionary = {}
var music_panel: PanelContainer
var music_label: Label
var music_stem_label: RichTextLabel
var music_buttons: Array[Button] = []
var music_play_btn: Button
var music_vol_btn: Button
var music_rook_btn: Button
var music_load_btn: Button
var music_sketch_btn: Button
var sketch_generator: AudioStreamGenerator
var sketch_playback: AudioStreamGeneratorPlayback
var sketch_player: AudioStreamPlayer
var local_audio_player: AudioStreamPlayer
var reward_audio_player: AudioStreamPlayer
var reward_sounds_enabled := true
var reward_audio_unlocked := false
var reward_sound_count := 0
var reward_sound_last_cue := ""
var sounds_btn: Button
var music_toggle_btn: Button
var progress_label: Label
var header_details_expanded := false
var player_nameplate: Label3D
var readable_scene_labels: Array[Label3D] = []
var visible_scene_captions: Array[Dictionary] = []
var music_mode := "sketch"
var music_playing := false
var music_volume := 0.70
var local_music_name := ""
var music_error := ""
var sketch_tick := 0
var sketch_phase := 0.0
var sketch_frames_pushed := 0
var last_pre_gain_rms := 0.0
var last_sample_rms := 0.0
var cue_history: Array[Dictionary] = []
var last_music_cue := "ready"
var unlocked_stem_mask := 1
var cached_mural_tangent := Vector2.ZERO
var cached_mural_normal := Vector2.ZERO
var cached_speaker_tangent := Vector2.ZERO
var cached_speaker_normal := Vector2.ZERO

var block_banner_node: Node3D
var block_opened := false
var keepsake_photo: Dictionary = {"status": "unasked", "participants": [], "mural": {}, "palette": "garden", "layout": "table"}
var epilogue_packing := false
var epilogue_returned: Array[String] = []
var keepsake_frame_node: Node3D
var keepsake_canvas_mesh: MeshInstance3D
var keepsake_guest_pips: Dictionary = {}
var loan_return_beacons: Dictionary = {}
var programme_order: Array[String] = []
var programme_published: Array[String] = []
var hosting_order: Array[String] = []
var hosting_results: Array[Dictionary] = []
var hosting_draft: Dictionary = {"story": "memory", "pattern": 85, "tiles": [0, 1, 2, 2, 1, 0], "palette": "warm", "quiet": "arc"}
var programme_board_node: Node3D
var programme_segment_bars: Array[MeshInstance3D] = []
var hosting_tile_panel_node: Node3D
var hosting_tile_meshes: Array[MeshInstance3D] = []
var district_boundary_node: MeshInstance3D
var district_boundary_visible := true
var west_intersection_nodes: Array[Node3D] = []
var history_stop_nodes: Dictionary = {}
var history_beacon_meshes: Dictionary = {}
var history_read := false
var blackhawk_discovered := false
var block_panel: PanelContainer
var block_label: Label
var block_detail_label: RichTextLabel
var block_buttons: Array[Button] = []
var block_next_btn: Button
var block_mural_btn: Button
var block_rook_btn: Button
var block_west_btn: Button
var block_district_btn: Button
var block_open_btn: Button
var block_epilogue_btn: Button
var block_programme_btn: Button
var block_civic_btn: Button
var block_film_btn: Button
var block_voices_btn: Button
var block_import_btn: Button
var settings_path := GODOT_SETTINGS_PATH
var civic_phase := "idle"
var civic_draft: Dictionary = {"topic": "repairs", "format": "circle", "notes": "themes"}
var civic_result: Dictionary = {}
var civic_setup_node: Node3D
var civic_circle_group: Node3D
var civic_dropin_group: Node3D
var civic_done_beacon: MeshInstance3D
var film_phase := "idle"
var film_draft: Dictionary = {"framing": "close", "plan": "quiet", "order": ["seat", "paint", "welcome"]}
var film_result: Dictionary = {}
var film_captured: Array[String] = []
var film_screen_frame := 0
var film_storyboard_node: Node3D
var film_frame_canvas: MeshInstance3D
var film_wide_border: MeshInstance3D
var film_shot_pips: Array[MeshInstance3D] = []
var optional_save_data: Dictionary = {}
var voices_enabled := false
var voices_status := "off"
var voices_error := ""
var voices_suspended := false
var voices_simulate_error := false
var voices_generation := 0
var voices_release_count := 0
var voices_checked_at := ""
var voices_records: Array[Dictionary] = []
var voices_custom_json_override := ""
var browser_import_status := "none"
var browser_import_message := ""
var last_a11y_announcement := ""
var a11y_announcement_seq := 0
var last_synced_a11y_json := ""
var a11y_sync_pending := false
var button_focus_style: StyleBoxFlat
var last_exported_keepsake_svg := ""
var last_voices_teardown_usec := 0
const MUSEUM_HUB_POS := Vector3(-293.5, 0.0, -64.5)
const SO_WHAT_VIEW_TARGET := Vector3(-320.0, 14.0, 82.6)
const NEIGHBORHOOD_EATERIES: Array[Dictionary] = [
	{
		"id": "bowl_basil_pho",
		"name": "Bowl & Basil Pho Counter",
		"kind": "Eatery",
		"street": "400 block of Turk St",
		"specialty": "24-hour simmered lemongrass beef & mushroom pho, crispy imperial rolls, and iced Thai tea",
		"pos": Vector3(-384.0, 0.0, 63.8),
		"canopy_color": "b83b2b",
		"label_color": "ffe699"
	},
	{
		"id": "saffron_clay_oven",
		"name": "Saffron Clay-Oven Naan & Curry",
		"kind": "Eatery",
		"street": "Jones St near Eddy",
		"specialty": "Tandoori clay-oven garlic naan, smoky chana masala, and mango lassi served late",
		"pos": Vector3(-152.0, 0.0, -28.0),
		"canopy_color": "d47a27",
		"label_color": "ffe8a3"
	},
	{
		"id": "blue_valve_hifi",
		"name": "The Blue Valve Vinyl & Hi-Fi Bar",
		"kind": "Bar & Lounge",
		"street": "300 block of Eddy St (near Cadillac Hotel)",
		"specialty": "Warm tube-amp jazz LPs, zero-proof botanical highballs, and classic neighborhood cocktails",
		"pos": Vector3(-258.0, 0.0, -71.5),
		"canopy_color": "224868",
		"label_color": "8de4e8"
	},
	{
		"id": "morning_star_banh_mi",
		"name": "Morning Star Banh Mi & Coffee",
		"kind": "Eatery",
		"street": "100 block of Turk St",
		"specialty": "Crackling warm baguettes with pickled daikon-carrot, jalapeño, cilantro, and condensed-milk iced coffee",
		"pos": Vector3(-54.0, 0.0, 11.2),
		"canopy_color": "2f6e4e",
		"label_color": "ffe699"
	},
	{
		"id": "copper_cue_tavern",
		"name": "Copper Cue Tavern & Billiards",
		"kind": "Corner Bar",
		"street": "Leavenworth St between Turk & Eddy",
		"specialty": "Vintage neon booths, neighborhood pool table, jukebox soul 45s, and cold draft pours",
		"pos": Vector3(-312.0, 0.0, -22.0),
		"canopy_color": "5a3463",
		"label_color": "f5c2ff"
	},
	{
		"id": "open_seat_diner",
		"name": "Open Seat Diner & Pie Counter",
		"kind": "Eatery",
		"street": "Taylor St opening block",
		"specialty": "Sourdough griddle cakes, hash browns, counter stools, and warm olallieberry pie",
		"pos": Vector3(10.5, 0.0, 26.0),
		"canopy_color": "356873",
		"label_color": "ffe8a3"
	}
]
# Session-only landmark tour state (reset on fresh/reload; excluded from save envelope to preserve M6 <= 4096 B budget).
var museum_hub_step := 0
var active_time_era := "present"
var visited_museum_eras: Dictionary = {}
var boeddeker_park_visited := false
var so_what_visited := false
var landmark_tour_celebrated := false
const TOUR_MUSEUM_ERAS := ["present", "1961_jazz", "1966_comptons", "1907_cadillac"]
const TOUR_MUSEUM_TITLES := ["Museum: Present Day", "Museum: 1961 Jazz", "Museum: 1966 Compton's", "Museum: 1907 Cadillac"]
const SO_WHAT_AWNING_XZ := Vector2(-350.0, 65.8)
var portal_lens_mesh: MeshInstance3D
var portal_ring_meshes: Array[MeshInstance3D] = []
var eatery_guide_idx := -1
var camera_yaw := 0.0
var camera_pitch_scale := 1.0
var orbit_dragging := false
var orbit_last_pos := Vector2.ZERO
var button_normal_style: StyleBoxFlat
var button_hover_style: StyleBoxFlat
var panel_bg_style: StyleBoxFlat
var walk_anim_clock := 0.0
var player_stride_blend := 0.0
var last_player_anim_xz := Vector2(INF, INF)
var last_proximity_neighbor := -1
var street_signs_root: Node3D
var concert_musician_nodes: Array[Node3D] = []
var concert_crowd_nodes: Array[Node3D] = []
var objective_label: Label
var gathering_layout := ""
var gathering_layouts_node: Node3D
var layout_table_node: Node3D
var layout_floor_node: Node3D
var gathering_lights_node: Node3D
var gathering_layout_center := Vector2.ZERO
var story_card: PanelContainer
var layout_refit_generation := 0
var layout_refit_pending := false
var panel_frame_subject := Vector3.ZERO
var panel_frame_control: Control
var panel_frame_pose: Array = []
var panel_refit_generation := 0
var compact_panel_layout_pending := false
var compact_panel_layout_busy := false
var compact_panel_layout_signature: Array = []
var story_title_label: Label
var story_body_label: RichTextLabel
var story_continue_btn: Button
var startup_story_pending := false
var last_story_chapter := -1
var block_panel_mode := "hub"
var opening_conversation := false
var talk_partner := -1
var conv_rows: Array[HBoxContainer] = []
var block_actions_grid: GridContainer
var block_page_nav: HBoxContainer
var block_page_prev: Button
var block_page_next: Button
var block_close_btn: Button
var block_hub_page := 0
const BLOCK_ACTIONS_PER_PAGE := 4
const SIDE_HUB_MIN_WIDTH := 600.0
const SIDE_ACTIVITY_MIN_WIDTH := 560.0
const COMPACT_ACTIVITY_MAX_HEIGHT := 640.0
const SIDE_HUB_MAX_HEIGHT := 560.0
const HUB_FULL_WIDTH := 1050.0
const BLOCK_ACTION_COUNT := 12
var conv_buttons: Array[Button] = []
var conv_chat_btn: Button
var conv_next_btn: Button
var conv_bye_btn: Button
var conv_action_btns: Array[Button] = []
var conv_action_ids: Array[String] = ["", "", ""]
var guide_marker: Node3D
var guide_marker_target := Vector3.ZERO
var guide_marker_target_name := ""
var guide_arrow: Control
var guide_arrow_poly: Polygon2D
var guide_arrow_label: Label
var button_suggest_style: StyleBoxFlat
var talk_prompt_node: Node3D
var talk_prompt_label: Label3D
var talk_prompt_bg: MeshInstance3D
var talk_prompt_neighbor := -1
var objective_refresh_timer := 0.0
var ui_clock := 0.0
var field_survey_overrides: Dictionary = FIELD_SURVEY_OVERRIDES.duplicate(true)
var last_built_palette: Dictionary = {}
var built_palettes: Dictionary = {}
# Facade colors picked by eye from the creator's own street photo of 145 Leavenworth (Feb 2025),
# shared in conversation; the image itself is not copied into the repository. They override the
# location palettes; Field Guide survey colors still win.
const CREATOR_PHOTO_PALETTES := {
	# TL Residences, 145 Leavenworth St (OSM way 1258857968): oxblood panels, black window bays and
	# railings, dark storefront under the "TL145" sign. The facade builder also uses the cornice color for
	# bay-window frames, so it is the near-black of the bays (the thin light coping is not modeled).
	"osm:way/1258857968": {"base": "7b3530", "spandrel": "1d1e21", "plinth": "2a2b2e", "cornice": "26272a"},
	# Kelly Cullen Community (former YMCA), 220 Golden Gate Ave, south of it: peach-tan brick, cream
	# cornice and ground-floor pilasters, iron fire escape on the Leavenworth side.
	"201006.0001527": {"base": "d9b48c", "spandrel": "cfa77e", "plinth": "e2d2b4", "cornice": "eadcc2", "fire_escape": true},
	# Page Hotel, 161 Leavenworth St, north of it: tan brick over a slate blue-green ground floor.
	"201006.0013153": {"base": "d3a37e", "spandrel": "c3906b", "plinth": "3e4f54", "cornice": "dcc6a8"}
}
var street_intersections: Array[Vector2] = []
var street_intersection_streets: Array[PackedStringArray] = []
var corner_tower_sites: Dictionary = {}
var building_shader_material: ShaderMaterial
var rooftop_feature_counts: Dictionary = {"parapets": 0, "water_tanks": 0, "penthouses": 0, "skylights": 0, "vents": 0, "corner_towers": 0, "lidar_masses": 0}
var rooftop_feature_points: Array[Dictionary] = []
var trolley_pole_points: Array[Vector2] = []
var trolley_wire_runs := 0
var boeddeker_park_node: Node3D
var boeddeker_tree_points: Array[Vector2] = []
var park_tree_canopies: Array[Node3D] = []
var tree_trunk_mesh: CylinderMesh
var tree_canopy_mesh: SphereMesh
var tree_trunk_material: StandardMaterial3D
var tree_leaf_materials: Array[StandardMaterial3D] = []
var world_env: Environment
var sun_light: DirectionalLight3D
var rim_light: DirectionalLight3D
var evening_mode := false
var speech_bubble_root: Node3D
var speech_bubble_node: Node3D
var speech_bubble_label: Label3D
var speech_bubble_bg: MeshInstance3D
var speech_bubble_border: MeshInstance3D
var speech_bubble_anchor := ""
var speech_bubble_anchor_pos := Vector3.ZERO
var speech_bubble_text := ""
var speech_bubble_timer := 0.0
var speech_bubble_age := 0.0
var speech_bubble_box := Vector3(200.0, 60.0, 16.0)
var speech_bubble_shift := 0.0
var speech_bubble_deferred := false
var speech_bubble_in_info := false
var speech_bubble_in_activity := false
var speech_bubble_activity_matched := false
var speech_opened_info := false
var storefront_light_spots: Array[Dictionary] = []
var light_pool_centers: Array[Vector2] = []
var light_pool_material: StandardMaterial3D
var street_lamp_points: Array[Vector2] = []
var planter_canopy_nodes: Array[Node3D] = []
var planter_canopy_base: Array[Vector3] = []
var street_tree_points: Array[Vector2] = []
var street_tree_ids: Array[String] = []
var street_tree_species: Array[String] = []
var street_tree_source: Dictionary = {}
var street_tree_pivots: Array[Vector3] = []
var street_tree_scales: Array[float] = []
var street_tree_yaws: Array[float] = []
var street_tree_lower_mm: MultiMesh
var street_tree_upper_mm: MultiMesh
var street_tree_sway_sample := Vector2.ZERO
var wind_clock := 0.0
var eatery_counter_nodes: Array[Node3D] = []
var eatery_host_nodes: Array[Node3D] = []
var eatery_counter_points: Array[Vector2] = []
var eatery_anim_parts: Array[Dictionary] = []
var eatery_order_counts: Dictionary = {}
var eatery_anim_clock := 0.0
var surprise_root: Node3D
var surprise_nodes: Dictionary = {}
var surprise_beacon_meshes: Dictionary = {}
var surprise_points: Dictionary = {}
var drag_performer_nodes: Array[Node3D] = []
var viking_biker_node: Node3D
var viking_bike_mesh: Node3D
var surprise_vinyl_mesh: MeshInstance3D
var cutesy_dino_node: Node3D
var cutesy_dino_tail_node: Node3D
var magic_carpet_chef_node: Node3D
var magic_carpet_chef_person: Node3D
var clown_horn_walker_node: Node3D
var clown_horn_bulb_mesh: MeshInstance3D
var mayor_event_speaker_node: Node3D
var mayor_fanfare_bugler_node: Node3D
var mayor_scissors_node: Node3D
var jeffrey_turntable_node: Node3D
var jeffrey_turntable_disc_mesh: MeshInstance3D
var hidden_mural_sketch_node: Node3D
var surprise_keepsake_nodes: Dictionary = {}
var bea_mayor_ribbon_node: Node3D
var bea_treat_box_node: Node3D
var celeste_dino_figurine_node: Node3D
var celeste_dino_tail_node: MeshInstance3D
var rook_clown_horn_node: Node3D
var rook_clown_horn_bulb_mesh: MeshInstance3D
var dez_viking_charm_node: Node3D
var dez_carpet_keepsake_node: Node3D
var thanh_starlight_fan_node: Node3D
var thanh_nacho_bag_node: Node3D
var character_panel_styles: Dictionary = {}
var discovered_surprises: Dictionary = {}
var surprise_guide_idx := -1
# Session-only hint persistence across conversation panels (cleared on save/reload or reset).
var last_hinted_surprise_id := ""
var reward_banner: PanelContainer
var reward_banner_style: StyleBoxFlat
var reward_title_label: Label
var reward_body_label: Label
var reward_banner_timer := 0.0
var reward_banner_milestone := false
var reward_info_prefix := ""
var reward_burst_count := 0
var last_reward_title := ""
var celebration_burst_node: Node3D
var celebration_gem_meshes: Array[MeshInstance3D] = []
var celebration_burst_label: Label3D
var celebration_burst_timer := 0.0
var celebration_burst_age := 0.0
var suppress_feel_good_burst := false
var cue_arpeggio_freqs: Array[float] = [523.25, 659.25, 783.99]
var cue_arpeggio_duration := 0.36

func colored_quad(surface: SurfaceTool, p00: Vector3, p10: Vector3, p11: Vector3, p01: Vector3, col: Color) -> void:
	surface.set_color(col)
	surface.add_vertex(p00)
	surface.set_color(col)
	surface.add_vertex(p10)
	surface.set_color(col)
	surface.add_vertex(p11)
	surface.set_color(col)
	surface.add_vertex(p00)
	surface.set_color(col)
	surface.add_vertex(p11)
	surface.set_color(col)
	surface.add_vertex(p01)

func colored_tri(surface: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, col: Color) -> void:
	surface.set_color(col)
	surface.add_vertex(a)
	surface.set_color(col)
	surface.add_vertex(b)
	surface.set_color(col)
	surface.add_vertex(c)

## Box resting on its center, local X along axis_xz (ground plane); bottom face omitted.
func colored_box(surface: SurfaceTool, center: Vector3, half: Vector3, axis_xz: Vector2, col: Color, top_col: Color) -> void:
	var ax2 := axis_xz.normalized() if axis_xz.length_squared() > 1e-8 else Vector2.RIGHT
	var ax := Vector3(ax2.x, 0.0, ax2.y) * half.x
	var az := Vector3(-ax2.y, 0.0, ax2.x) * half.z
	var lo := center + Vector3.DOWN * half.y
	var hi := center + Vector3.UP * half.y
	colored_quad(surface, lo - ax - az, lo + ax - az, hi + ax - az, hi - ax - az, col)
	colored_quad(surface, lo + ax - az, lo + ax + az, hi + ax + az, hi + ax - az, col.darkened(0.10))
	colored_quad(surface, lo + ax + az, lo - ax + az, hi - ax + az, hi + ax + az, col.darkened(0.04))
	colored_quad(surface, lo - ax + az, lo - ax - az, hi - ax - az, hi - ax + az, col.darkened(0.14))
	colored_quad(surface, hi - ax - az, hi + ax - az, hi + ax + az, hi - ax + az, top_col)

## Vertical n-sided prism / frustum; r_top == 0 makes a cone. cap_col with alpha 0 leaves the top open.
func colored_prism(surface: SurfaceTool, base: Vector3, r_bottom: float, r_top: float, height: float, sides: int, col: Color, cap_col: Color) -> void:
	var top := base + Vector3.UP * height
	for s in range(sides):
		var a0 := TAU * float(s) / float(sides)
		var a1 := TAU * float(s + 1) / float(sides)
		var d0 := Vector3(cos(a0), 0.0, sin(a0))
		var d1 := Vector3(cos(a1), 0.0, sin(a1))
		var shade := col.darkened(0.12 * (0.5 + 0.5 * sin(a0 + 0.8)))
		if r_top > 1e-4:
			colored_quad(surface, base + d0 * r_bottom, base + d1 * r_bottom, top + d1 * r_top, top + d0 * r_top, shade)
			if cap_col.a > 0.0:
				colored_tri(surface, top, top + d0 * r_top, top + d1 * r_top, cap_col)
		else:
			colored_tri(surface, base + d0 * r_bottom, base + d1 * r_bottom, top, shade)

## Square-section beam between two points (wires, legs, braces, rails).
func colored_beam(surface: SurfaceTool, a: Vector3, b: Vector3, thickness: float, col: Color) -> void:
	var d := b - a
	if d.length_squared() < 1e-8:
		return
	var dn := d.normalized()
	var side := dn.cross(Vector3.UP)
	if side.length_squared() < 1e-6:
		side = dn.cross(Vector3.RIGHT)
	side = side.normalized() * (thickness * 0.5)
	var up := side.cross(dn).normalized() * (thickness * 0.5)
	colored_quad(surface, a - side - up, b - side - up, b + side - up, a + side - up, col.darkened(0.15))
	colored_quad(surface, a + side - up, b + side - up, b + side + up, a + side + up, col)
	colored_quad(surface, a + side + up, b + side + up, b - side + up, a - side + up, col.lightened(0.08))
	colored_quad(surface, a - side + up, b - side + up, b - side - up, a - side - up, col)

# Vertex-colored building shader. Window glass carries a flag in vertex alpha (< 0.65 lit at night,
# < 0.95 unlit glass); every other surface is opaque alpha 1. By day it matches the former
# StandardMaterial3D (vertex color albedo, roughness 1, double-sided); in evening mode lit windows glow.
const BUILDING_SHADER_CODE := """
shader_type spatial;
render_mode cull_disabled;
uniform float night_glow = 0.0;
void fragment() {
	float glass = 1.0 - step(0.95, COLOR.a);
	float lit = 1.0 - step(0.65, COLOR.a);
	ALBEDO = mix(COLOR.rgb, COLOR.rgb * 0.42, glass * night_glow);
	ROUGHNESS = 1.0;
	EMISSION = COLOR.rgb * lit * night_glow * 0.9;
}
"""

func building_material() -> ShaderMaterial:
	if building_shader_material == null:
		var sh := Shader.new()
		sh.code = BUILDING_SHADER_CODE
		building_shader_material = ShaderMaterial.new()
		building_shader_material.shader = sh
		building_shader_material.set_shader_parameter("night_glow", 0.0)
	return building_shader_material

## Window glass color tagged for the building shader: lit (glows in evening mode) or unlit.
func glass_flag(col: Color, lit_at_night: bool) -> Color:
	return Color(col.r, col.g, col.b, 0.5 if lit_at_night else 0.8)

func vertex_color_material() -> StandardMaterial3D:
	var result := material(Color.WHITE)
	result.vertex_color_use_as_albedo = true
	return result

func ring_signed_area(ring: Array) -> float:
	var area := 0.0
	var n := ring.size()
	for i in range(n):
		var p0: Array = ring[i]
		var p1: Array = ring[(i + 1) % n]
		area += float(p0[0]) * float(p1[1]) - float(p1[0]) * float(p0[1])
	return area * 0.5

func polygon_edge_clearance(pt: Vector2, polygon: Dictionary) -> float:
	var best := INF
	for ring in polygon.rings:
		var n: int = ring.size()
		for i in range(n):
			var p0: Array = ring[i]
			var p1: Array = ring[(i + 1) % n]
			best = minf(best, dist_to_segment_2d(pt, Vector2(p0[0], p0[1]), Vector2(p1[0], p1[1])))
	return best

## Deterministic roof placement: first 7x7 grid sample inside the footprint (holes excluded)
## with at least `clearance` metres to every roof edge and `avoid_r` metres from earlier roof items.
func find_roof_spot(polygon: Dictionary, clearance: float, rseed: int, avoid: Array[Vector2], avoid_r: float) -> Vector2:
	var ring: Array = polygon.rings[0]
	if ring.is_empty():
		return Vector2(INF, INF)
	var r_rect := Rect2(Vector2(ring[0][0], ring[0][1]), Vector2.ZERO)
	for rp in ring:
		r_rect = r_rect.expand(Vector2(rp[0], rp[1]))
	var grid := 7
	var total := grid * grid
	var start := posmod(rseed, total)
	for k in range(total):
		var cell := (start + k * 17) % total
		var gx := float(cell % grid) + 0.5
		var gz := float(cell / grid) + 0.5
		var cand := r_rect.position + Vector2(r_rect.size.x * gx / float(grid), r_rect.size.y * gz / float(grid))
		if not is_point_in_building_polygon(cand, polygon):
			continue
		if polygon_edge_clearance(cand, polygon) < clearance:
			continue
		var clash := false
		for av in avoid:
			if av.distance_to(cand) < avoid_r:
				clash = true
				break
		if not clash:
			return cand
	return Vector2(INF, INF)

func compute_street_intersections() -> void:
	street_intersections.clear()
	var seen: Dictionary = {}
	for street in street_ways:
		var s_name := String(street.get("name", ""))
		for p in street.points:
			var key := "%.2f,%.2f" % [float(p[0]), float(p[1])]
			if not seen.has(key):
				seen[key] = {"pt": Vector2(float(p[0]), float(p[1])), "names": {}}
			seen[key].names[s_name] = true
	street_intersection_streets.clear()
	for key in seen:
		if seen[key].names.size() >= 2:
			street_intersections.append(seen[key].pt)
			street_intersection_streets.append(PackedStringArray(seen[key].names.keys()))

## Convex footprint corner facing a street intersection -> turret site, or {} if the corner is unsuitable.
func corner_site_for_vertex(polygon: Dictionary, v_i: int, ix: Vector2) -> Dictionary:
	var ring: Array = polygon.rings[0]
	var n := ring.size()
	if n < 3:
		return {}
	var v := Vector2(ring[v_i][0], ring[v_i][1])
	var prev := v
	var next := v
	for k in range(1, n):
		var cand := Vector2(ring[posmod(v_i - k, n)][0], ring[posmod(v_i - k, n)][1])
		if cand.distance_to(v) >= 2.0:
			prev = cand
			break
	for k in range(1, n):
		var cand2 := Vector2(ring[(v_i + k) % n][0], ring[(v_i + k) % n][1])
		if cand2.distance_to(v) >= 2.0:
			next = cand2
			break
	if prev == v or next == v:
		return {}
	var bis := (prev - v).normalized() + (next - v).normalized()
	if bis.length() < 0.9:
		return {}
	bis = bis.normalized()
	if not is_point_in_building_polygon(v + bis * 1.2, polygon):
		return {}
	if (ix - v).dot(bis) >= 0.0:
		return {}
	return {"vertex": v, "bisector": bis, "center": v + bis * 1.45, "radius": 2.3, "intersection": ix}

## Picks the tallest corner building at each intersection (plus an occasional second tall corner)
## for a stylized SF corner bay turret. Procedural, not a surveyed per-building claim.
func compute_corner_tower_sites() -> void:
	corner_tower_sites.clear()
	var all_list: Array = []
	all_list.append_array(data.buildings)
	all_list.append_array(data.get("wider_buildings", []))
	for ix in street_intersections:
		var cands: Array[Dictionary] = []
		for b in all_list:
			var h: float = b.height_m
			# Stylized turrets only on roofs the 2023 LiDAR has not measured, and never on replaced footprints.
			if h < CORNER_TOWER_MIN_HEIGHT_M or is_superseded_building(String(b.id)) or lidar_roofs.has(String(b.id)):
				continue
			for polygon in b.polygons:
				var ring: Array = polygon.rings[0]
				var best_i := -1
				var best_d := INF
				for v_i in range(ring.size()):
					var d := Vector2(ring[v_i][0], ring[v_i][1]).distance_to(ix)
					if d < best_d:
						best_d = d
						best_i = v_i
				if best_i >= 0 and best_d <= CORNER_TOWER_MAX_CORNER_DIST_M:
					cands.append({"id": String(b.id), "h": h, "polygon": polygon, "vertex_index": best_i})
		cands.sort_custom(func(x: Dictionary, y: Dictionary) -> bool: return float(x.h) > float(y.h))
		var granted := 0
		for c in cands:
			if granted >= 2:
				break
			var c_id: String = c.id
			if corner_tower_sites.has(c_id):
				continue
			if granted > 0 and not (absi(c_id.hash()) % 3 == 0 and float(c.h) >= 20.0):
				continue
			var site := corner_site_for_vertex(c.polygon, int(c.vertex_index), ix)
			if site.is_empty():
				continue
			corner_tower_sites[c_id] = site
			granted += 1

func add_water_tank(surface: SurfaceTool, base: Vector3, rseed: int) -> float:
	var timber := Color("5b4636")
	var cedar := Color("8f6a48") if rseed % 2 == 0 else Color("7c5d43")
	var hoop := Color("34312e")
	var no_cap := Color(0, 0, 0, 0)
	var leg_h := 1.9
	var corners: Array[Vector3] = [Vector3(-0.92, 0.0, -0.92), Vector3(0.92, 0.0, -0.92), Vector3(0.92, 0.0, 0.92), Vector3(-0.92, 0.0, 0.92)]
	for c_i in range(4):
		var c0: Vector3 = corners[c_i]
		var c1: Vector3 = corners[(c_i + 1) % 4]
		colored_beam(surface, base + c0 * 1.08, base + c0 * 0.9 + Vector3.UP * leg_h, 0.17, timber)
		colored_beam(surface, base + c0 + Vector3.UP * 0.25, base + c1 + Vector3.UP * (leg_h - 0.2), 0.08, timber.lightened(0.1))
	colored_box(surface, base + Vector3(0.0, leg_h + 0.07, 0.0), Vector3(1.35, 0.07, 1.35), Vector2.RIGHT, timber.darkened(0.1), timber.lightened(0.15))
	var tank_base := base + Vector3.UP * (leg_h + 0.14)
	var tank_h := 2.3
	colored_prism(surface, tank_base, 1.22, 1.16, tank_h, 12, cedar, no_cap)
	for hoop_y in [0.35, 1.15, 1.95]:
		colored_prism(surface, tank_base + Vector3.UP * float(hoop_y), 1.25, 1.25, 0.08, 12, hoop, no_cap)
	colored_prism(surface, tank_base + Vector3.UP * tank_h, 1.30, 0.0, 0.75, 12, Color("4c4540"), no_cap)
	colored_prism(surface, tank_base + Vector3.UP * (tank_h + 0.72), 0.06, 0.06, 0.35, 6, hoop, hoop)
	return leg_h + 0.14 + tank_h + 1.07

func add_skylight(surface: SurfaceTool, base: Vector3, axis_xz: Vector2) -> void:
	var ax2 := axis_xz.normalized() if axis_xz.length_squared() > 1e-8 else Vector2.RIGHT
	var ax := Vector3(ax2.x, 0.0, ax2.y)
	var az := Vector3(-ax2.y, 0.0, ax2.x)
	colored_box(surface, base + Vector3.UP * 0.12, Vector3(0.85, 0.12, 0.6), ax2, Color("6f6c66"), Color("85827a"))
	var y0 := base + Vector3.UP * 0.24
	var hx := ax * 0.78
	var hz := az * 0.52
	var ridge := Vector3.UP * 0.40
	var glass := Color("9fd3df")
	colored_quad(surface, y0 - hx - hz, y0 + hx - hz, y0 + hx + ridge, y0 - hx + ridge, glass)
	colored_quad(surface, y0 + hx + hz, y0 - hx + hz, y0 - hx + ridge, y0 + hx + ridge, glass.darkened(0.12))
	colored_tri(surface, y0 - hx - hz, y0 - hx + ridge, y0 - hx + hz, glass.darkened(0.2))
	colored_tri(surface, y0 + hx - hz, y0 + hx + hz, y0 + hx + ridge, glass.darkened(0.2))
	colored_beam(surface, y0 - hx + ridge, y0 + hx + ridge, 0.06, Color("5d6466"))

## Octagonal SF corner bay turret with per-story windows, belt courses, and a cupola dome + finial.
func add_corner_tower(surface: SurfaceTool, site: Dictionary, h: float, pal: Dictionary, rseed: int) -> float:
	var c2: Vector2 = site.center
	var r := float(site.get("radius", 2.0))
	var sides := 8
	var no_cap := Color(0, 0, 0, 0)
	var base_y := minf(3.6, h * 0.30)
	var shaft_top := h + 2.0
	var cornice_c: Color = pal.cornice
	var base_c: Color = pal.base
	var wall_col := cornice_c.lerp(base_c, 0.35)
	var trim_col := cornice_c.lightened(0.15)
	var glass_cols: Array[Color] = [Color("ffe494"), Color("f5b562"), Color("88c6d8")]
	var mid_h := shaft_top - base_y
	var stories := maxi(1, int(floor(mid_h / 3.2)))
	var story_h := mid_h / float(stories)
	var base := Vector3(c2.x, 0.0, c2.y)
	colored_prism(surface, base + Vector3.UP * (base_y - 0.55), r * 0.5, r, 0.55, sides, trim_col.darkened(0.15), no_cap)
	for s_i in range(stories):
		var y0 := base_y + float(s_i) * story_h
		colored_prism(surface, base + Vector3.UP * y0, r, r, story_h, sides, wall_col, no_cap)
		var wy0 := y0 + story_h * 0.24
		var wy1 := y0 + story_h * 0.76
		for f in range(sides):
			var a0 := TAU * float(f) / float(sides)
			var a1 := TAU * float(f + 1) / float(sides)
			var d0 := Vector3(cos(a0), 0.0, sin(a0))
			var d1 := Vector3(cos(a1), 0.0, sin(a1))
			var nrm := (d0 + d1).normalized() * 0.035
			var w0 := (base + d0 * r + nrm).lerp(base + d1 * r + nrm, 0.2)
			var w1 := (base + d0 * r + nrm).lerp(base + d1 * r + nrm, 0.8)
			var g_col: Color = glass_cols[(rseed + f + s_i * 3) % glass_cols.size()]
			colored_quad(surface, w0 + Vector3.UP * wy0, w1 + Vector3.UP * wy0, w1 + Vector3.UP * wy1, w0 + Vector3.UP * wy1, glass_flag(g_col, (f + s_i) % 3 != 0))
		colored_prism(surface, base + Vector3.UP * (y0 + story_h - 0.12), r + 0.06, r + 0.06, 0.12, sides, trim_col, no_cap)
	colored_prism(surface, base + Vector3.UP * shaft_top, r + 0.28, r + 0.28, 0.32, sides, trim_col, trim_col.darkened(0.1))
	var dome_cols: Array[Color] = [Color("5e9c88"), Color("56606b"), Color("b8643f")]
	var dome_col: Color = dome_cols[rseed % dome_cols.size()]
	var dome_base := shaft_top + 0.32
	var dome_r := r * 0.98
	var steps := 4
	for k in range(steps):
		var th0 := (PI * 0.5) * float(k) / float(steps)
		var th1 := (PI * 0.5) * float(k + 1) / float(steps)
		var y_a := dome_base + sin(th0) * dome_r * 1.1
		var y_b := dome_base + sin(th1) * dome_r * 1.1
		var r_b := cos(th1) * dome_r if k < steps - 1 else 0.0
		colored_prism(surface, base + Vector3.UP * y_a, cos(th0) * dome_r, r_b, y_b - y_a, sides, dome_col.lightened(0.05 * float(k)), no_cap)
	var dome_top := dome_base + dome_r * 1.1
	colored_prism(surface, base + Vector3.UP * dome_top, 0.07, 0.05, 0.9, 6, Color("d8b45a"), Color("d8b45a"))
	colored_prism(surface, base + Vector3.UP * (dome_top + 0.55), 0.17, 0.17, 0.16, 6, Color("e2c46a"), Color("e2c46a"))
	return dome_top + 0.9

## Resolves one sf16_bldgid's Field Guide survey: tag styles (FIELD_SURVEY_TAG_STYLES) first,
## then explicit hex colors. Returns {} for unsurveyed buildings.
func field_survey_style(b_id: String) -> Dictionary:
	var style := {}
	var rec: Variant = field_survey_overrides.get(b_id, null)
	if not rec is Dictionary:
		return style
	var tags: Variant = rec.get("tags", [])
	if tags is Array:
		for tag in tags:
			var tag_style: Variant = FIELD_SURVEY_TAG_STYLES.get(String(tag), null)
			if tag_style is Dictionary:
				for key in tag_style:
					var val: Variant = tag_style[key]
					style[key] = Color(String(val)) if val is String else val
	for key in ["base", "spandrel", "plinth", "cornice"]:
		var hex: Variant = rec.get(key, null)
		if hex is String and Color.html_is_valid(hex):
			style[key] = Color(hex)
	return style

func record_rooftop_feature(kind: String, b_id: String, xz: Vector2, top_y: float) -> void:
	rooftop_feature_counts[kind] = int(rooftop_feature_counts.get(kind, 0)) + 1
	rooftop_feature_points.append({"kind": kind, "id": b_id, "xz": xz, "top": top_y})

## 2023 USGS LiDAR roofs (Roofer LoD 1.3) and current OpenStreetMap outlines for buildings the
## 2010 city layer lacks, derived offline by scripts/build-lidar-2023.mjs into data/lidar_2023.json.
func load_lidar_data() -> void:
	lidar_source = {}
	lidar_roofs = {}
	lidar_superseded = {}
	lidar_additions = []
	var raw := FileAccess.get_file_as_string(LIDAR_DATA_PATH)
	var parsed: Variant = JSON.parse_string(raw) if not raw.is_empty() else null
	if not parsed is Dictionary:
		push_warning("Missing data/lidar_2023.json; run node scripts/build-lidar-2023.mjs.")
		return
	lidar_source = parsed.get("source", {})
	lidar_roofs = parsed.get("roofs", {})
	for s_rec in parsed.get("superseded", []):
		lidar_superseded[String(s_rec.id)] = s_rec
	lidar_additions = parsed.get("additions", [])

func is_superseded_building(b_id: String) -> bool:
	return lidar_superseded.has(b_id)

func lidar_record(b_id: String) -> Dictionary:
	if lidar_roofs.has(b_id):
		return lidar_roofs[b_id]
	for a_rec in lidar_additions:
		if String(a_rec.id) == b_id:
			return a_rec
	return {}

func lidar_addition(b_id: String) -> Dictionary:
	for a_rec in lidar_additions:
		if String(a_rec.id) == b_id:
			return a_rec
	return {}

## A 2010 footprint that a newer building has replaced keeps its record (ids, saves, tests) but is
## hidden and leaves physics and 2D collision; the current building comes from data/lidar_2023.json.
func hide_superseded_building(b_mesh: MeshInstance3D) -> void:
	b_mesh.visible = false
	var body := b_mesh.get_node_or_null("StaticBody3D") as StaticBody3D
	if body != null:
		body.process_mode = Node.PROCESS_MODE_DISABLED
		for ch in body.get_children():
			if ch is CollisionShape3D:
				(ch as CollisionShape3D).disabled = true

## Current outlines: 2010 footprints that still stand, plus OSM buildings the 2010 layer lacks, drawn
## at their 2023 LiDAR median height with the same facade builder. Facade colors are stylized.
func build_current_buildings() -> void:
	current_buildings.clear()
	current_building_rects.clear()
	addition_meshes.clear()
	addition_rects.clear()
	addition_materials.clear()
	occluded_additions.clear()
	for idx in range(all_buildings.size()):
		if is_superseded_building(String(all_buildings[idx].id)):
			continue
		current_buildings.append(all_buildings[idx])
		current_building_rects.append(all_building_rects[idx])
	var root := Node3D.new()
	root.name = CURRENT_BUILDINGS_NODE
	add_child(root)
	var add_palette: Array[Color] = [Color("d9d7d0"), Color("b8bec2"), Color("c9b9a6")]
	for a_idx in range(lidar_additions.size()):
		var a_rec: Dictionary = lidar_additions[a_idx]
		var rec := {"id": String(a_rec.id), "height_m": float(a_rec.height_m), "ground_m_navd88": float(a_rec.get("ground_m", 0.0)), "polygons": a_rec.polygons, "name": String(a_rec.get("name", "")), "address": String(a_rec.get("address", ""))}
		var built := make_building_mesh_and_rect(rec, building_material(), add_palette[a_idx % add_palette.size()])
		var a_mesh: MeshInstance3D = built.mesh
		a_mesh.reparent(root)
		a_mesh.name = "Addition_%d" % a_idx
		addition_meshes.append(a_mesh)
		addition_rects.append(built.rect)
		addition_materials.append(a_mesh.material_override)
		current_buildings.append(rec)
		current_building_rects.append(built.rect)
	rebuild_walk_building_bins()

## Raised roof parts measured by the 2023 LiDAR: flat-topped blocks from the 2010 median roof up to
## the measured height, with a window row per storey on tall walls. Returns the parts drawn.
func add_lidar_roof_masses(surface: SurfaceTool, b_id: String, masses: Array, h: float, pal: Dictionary) -> int:
	var drawn := 0
	var wall_col: Color = Color(pal.base).darkened(0.05)
	var top_col: Color = Color(pal.roof).lightened(0.10)
	var cap_col: Color = Color(pal.cornice)
	var glass := Color("93b4c2")
	for m_i in range(masses.size()):
		var m: Dictionary = masses[m_i]
		var top := float(m.h)
		if top <= h + 0.05:
			continue
		var verts: Array = m.vertices
		var tris: Array = m.triangles
		for t_i in range(0, tris.size(), 3):
			for k in range(3):
				surface.set_color(top_col)
				surface.add_vertex(point(verts[int(tris[t_i + k])], top))
		var rings: Array = m.rings
		var center := Vector2.ZERO
		for rp in rings[0]:
			center += Vector2(rp[0], rp[1])
		center /= float(rings[0].size())
		for r_idx in range(rings.size()):
			var ring: Array = rings[r_idx]
			var n := ring.size()
			for i in range(n):
				var a2 := Vector2(ring[i][0], ring[i][1])
				var b2 := Vector2(ring[(i + 1) % n][0], ring[(i + 1) % n][1])
				var seg := a2.distance_to(b2)
				if seg < 0.05:
					continue
				var a := Vector3(a2.x, h, a2.y)
				var b := Vector3(b2.x, h, b2.y)
				var rise := Vector3.UP * (top - h)
				colored_quad(surface, a, b, b + rise, a + rise, wall_col)
				colored_quad(surface, a + rise - Vector3.UP * 0.18, b + rise - Vector3.UP * 0.18, b + rise, a + rise, cap_col)
				if top - h < 2.6 or seg < 2.4:
					continue
				var t3 := (b - a) / seg
				var out2 := Vector2(t3.z, -t3.x)
				var mid := (a2 + b2) * 0.5
				if r_idx == 0 and (mid + out2 - center).length_squared() < (mid - out2 - center).length_squared():
					out2 = -out2
				elif r_idx > 0 and (mid + out2 - center).length_squared() > (mid - out2 - center).length_squared():
					out2 = -out2
				var off := Vector3(out2.x, 0.0, out2.y) * 0.03
				var storeys := int(floor((top - h - 0.4) / LIDAR_STOREY_M))
				for f_i in range(storeys):
					var y0 := h + 0.85 + float(f_i) * LIDAR_STOREY_M
					var lit := absi(("%s:%d:%d:%d" % [b_id, m_i, i, f_i]).hash()) % 100 < 55
					colored_quad(surface, a + t3 * 0.5 + off + Vector3.UP * (y0 - h), b - t3 * 0.5 + off + Vector3.UP * (y0 - h), b - t3 * 0.5 + off + Vector3.UP * (y0 - h + 1.35), a + t3 * 0.5 + off + Vector3.UP * (y0 - h + 1.35), glass_flag(glass, lit))
		record_rooftop_feature("lidar_masses", b_id, center, top)
		drawn += 1
	return drawn

## Separate child mesh so building meshes keep their measured LiDAR AABB height; hidden during cutaway.
func build_rooftop_details(building: Dictionary, h: float, pal: Dictionary) -> MeshInstance3D:
	var b_id := String(building.get("id", ""))
	if building.polygons.is_empty() or h < 3.0 or is_superseded_building(b_id):
		return null
	var rseed := absi(("%s:roof" % b_id).hash())
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	surface.set_smooth_group(-1)
	var base_col: Color = pal.base
	var cornice_col: Color = pal.cornice
	var roof_col: Color = pal.roof
	var survey: Dictionary = pal.get("survey", {})
	var roof_water_tank: bool = survey.get("roof_water_tank", false)
	var roof_penthouse: bool = survey.get("roof_penthouse", false)
	var roof_skylights: bool = survey.get("roof_skylights", false)
	# Measured 2023 LiDAR roof: draw its raised parts and skip the rule-placed penthouses, tanks,
	# skylights, and vents. Creator field-survey tags still force their items.
	var lidar_rec := lidar_record(b_id)
	var lidar_roof := not lidar_rec.is_empty()
	var feature_count := 0
	var main_poly: Dictionary = building.polygons[0]
	var best_area := 0.0
	for polygon in building.polygons:
		var ar := absf(ring_signed_area(polygon.rings[0]))
		if ar > best_area:
			best_area = ar
			main_poly = polygon
	var main_ring: Array = main_poly.rings[0]
	var edge_dir := Vector2.RIGHT
	var longest := 0.0
	for i in range(main_ring.size()):
		var ea := Vector2(main_ring[i][0], main_ring[i][1])
		var eb := Vector2(main_ring[(i + 1) % main_ring.size()][0], main_ring[(i + 1) % main_ring.size()][1])
		if ea.distance_to(eb) > longest:
			longest = ea.distance_to(eb)
			edge_dir = (eb - ea).normalized()
	# 1. Parapet walls with a light coping cap around every outer roof edge
	if h >= 6.0:
		var par_h := 0.55 if h < 12.0 else 0.85
		var par_t := 0.26
		for polygon in building.polygons:
			var ring: Array = polygon.rings[0]
			var n: int = ring.size()
			var ccw := ring_signed_area(ring) > 0.0
			for i in range(n):
				var a2 := Vector2(ring[i][0], ring[i][1])
				var b2 := Vector2(ring[(i + 1) % n][0], ring[(i + 1) % n][1])
				if a2.distance_to(b2) < 0.4:
					continue
				var t := (b2 - a2).normalized()
				var inward := Vector2(-t.y, t.x) if ccw else Vector2(t.y, -t.x)
				var a := Vector3(a2.x, h, a2.y)
				var b := Vector3(b2.x, h, b2.y)
				var in3 := Vector3(inward.x, 0.0, inward.y) * par_t
				var up := Vector3.UP * par_h
				colored_quad(surface, a, b, b + up, a + up, cornice_col.darkened(0.06))
				colored_quad(surface, b + in3, a + in3, a + in3 + up, b + in3 + up, roof_col.lightened(0.12))
				colored_quad(surface, a + up, b + up, b + in3 + up, a + in3 + up, cornice_col.lightened(0.18))
		record_rooftop_feature("parapets", b_id, Vector2(main_ring[0][0], main_ring[0][1]), h + par_h)
		feature_count += 1
	if lidar_roof:
		feature_count += add_lidar_roof_masses(surface, b_id, lidar_rec.get("masses", []), h, pal)
	# Surveyed vertical neon blade sign on the longest street-facing facade
	if bool(survey.get("neon_blade", false)) and h >= 6.0:
		var blade := neon_blade_site(main_ring)
		if not blade.is_empty():
			var out2: Vector2 = blade.outward
			var bp: Vector2 = blade.point
			var b_y0 := minf(3.6, h * 0.30) + 0.4
			var b_y1 := minf(h - 0.4, b_y0 + 6.5)
			var b_half := (b_y1 - b_y0) * 0.5
			var b_c := bp + out2 * 0.75
			colored_box(surface, Vector3(b_c.x, b_y0 + b_half, b_c.y), Vector3(0.68, b_half + 0.08, 0.10), out2, Color("1c2e3a"), Color("1c2e3a"))
			colored_box(surface, Vector3(b_c.x, b_y0 + b_half, b_c.y), Vector3(0.6, b_half, 0.14), out2, Color("f24f8a"), Color("ffb3cf"))
			record_rooftop_feature("neon_blades", b_id, b_c, b_y1)
			feature_count += 1
	var placed: Array[Vector2] = []
	var tower_site: Dictionary = corner_tower_sites.get(b_id, {})
	if not tower_site.is_empty():
		var t_top := add_corner_tower(surface, tower_site, h, pal, rseed)
		placed.append(tower_site.center)
		record_rooftop_feature("corner_towers", b_id, tower_site.center, t_top)
		feature_count += 1
	# 2. Elevator penthouse / stair bulkhead on taller mid-rises
	if (not lidar_roof and h >= 18.0 and best_area >= 120.0 and (rseed % 3) != 2) or (roof_penthouse and h >= 6.0 and best_area >= 50.0):
		var pp := find_roof_spot(main_poly, 2.4, rseed, placed, 4.0)
		if pp.x < INF:
			var ph := 2.7
			var perp := Vector2(-edge_dir.y, edge_dir.x)
			colored_box(surface, Vector3(pp.x, h + ph * 0.5, pp.y), Vector3(1.7, ph * 0.5, 1.35), edge_dir, base_col.darkened(0.20), roof_col.lightened(0.22))
			colored_box(surface, Vector3(pp.x, h + ph + 0.09, pp.y), Vector3(1.85, 0.09, 1.5), edge_dir, cornice_col.darkened(0.1), cornice_col.lightened(0.1))
			var door := pp + perp * 1.37
			colored_box(surface, Vector3(door.x, h + 1.0, door.y), Vector3(0.42, 1.0, 0.03), edge_dir, Color("3c4a52"), Color("3c4a52"))
			placed.append(pp)
			record_rooftop_feature("penthouses", b_id, pp, h + ph + 0.18)
			feature_count += 1
	# 3. Wooden water tank on a timber trestle
	if (not lidar_roof and h >= 14.0 and best_area >= 90.0 and ((rseed / 3) % 4) == 0) or (roof_water_tank and h >= 6.0 and best_area >= 40.0):
		var tp := find_roof_spot(main_poly, 2.2, rseed + 11, placed, 4.2)
		if tp.x < INF:
			var tank_top := add_water_tank(surface, Vector3(tp.x, h, tp.y), rseed)
			placed.append(tp)
			record_rooftop_feature("water_tanks", b_id, tp, h + tank_top)
			feature_count += 1
	# 4. Gabled glass skylights over stairwells and light courts
	if (not lidar_roof and h >= 5.0 and h <= 45.0 and best_area >= 60.0 and (rseed % 5) != 0) or (roof_skylights and best_area >= 20.0):
		var sky_n := 1 + (rseed / 5) % 2
		for s_i in range(sky_n):
			var sp := find_roof_spot(main_poly, 1.4, rseed + 29 + s_i * 7, placed, 2.6)
			if sp.x == INF:
				break
			add_skylight(surface, Vector3(sp.x, h, sp.y), edge_dir)
			placed.append(sp)
			record_rooftop_feature("skylights", b_id, sp, h + 0.64)
			feature_count += 1
	# 5. Brick chimneys on older low-rises, HVAC units elsewhere
	var vent_n := 0 if lidar_roof else (rseed / 7) % 3
	for v_i in range(vent_n):
		var vp := find_roof_spot(main_poly, 1.0, rseed + 53 + v_i * 13, placed, 2.0)
		if vp.x == INF:
			break
		if h < 20.0 and v_i == 0 and rseed % 2 == 0:
			colored_box(surface, Vector3(vp.x, h + 0.75, vp.y), Vector3(0.32, 0.75, 0.32), edge_dir, Color("8a4b3a"), Color("5a3a30"))
			record_rooftop_feature("vents", b_id, vp, h + 1.5)
		else:
			colored_box(surface, Vector3(vp.x, h + 0.42, vp.y), Vector3(0.7, 0.42, 0.55), edge_dir, Color("a3a7a5"), Color("c3c6c3"))
			colored_prism(surface, Vector3(vp.x, h + 0.84, vp.y), 0.3, 0.3, 0.03, 8, Color("4d5354"), Color("4d5354"))
			record_rooftop_feature("vents", b_id, vp, h + 0.87)
		placed.append(vp)
		feature_count += 1
	if feature_count == 0:
		return null
	surface.generate_normals()
	var det := MeshInstance3D.new()
	det.name = ROOFTOP_DETAIL_NODE
	det.mesh = surface.commit()
	det.material_override = building_material()
	return det

## Point 20% along the longest outer edge whose outward side faces a street, plus that outward normal.
func neon_blade_site(ring: Array) -> Dictionary:
	var n := ring.size()
	if n < 3:
		return {}
	var ccw := ring_signed_area(ring) > 0.0
	var best := {}
	var best_len := 3.0
	for i in range(n):
		var a2 := Vector2(ring[i][0], ring[i][1])
		var b2 := Vector2(ring[(i + 1) % n][0], ring[(i + 1) % n][1])
		var seg_len := a2.distance_to(b2)
		if seg_len <= best_len:
			continue
		var t := (b2 - a2) / seg_len
		var outward := Vector2(t.y, -t.x) if ccw else Vector2(-t.y, t.x)
		if min_street_distance((a2 + b2) * 0.5 + outward * 2.0) > MAX_STREET_CORRIDOR_M:
			continue
		best_len = seg_len
		best = {"point": a2.lerp(b2, 0.2), "outward": outward}
	return best

func set_rooftop_details_visible(b_mesh: MeshInstance3D, visible_flag: bool) -> void:
	if b_mesh == null:
		return
	var det := b_mesh.get_node_or_null(ROOFTOP_DETAIL_NODE) as Node3D
	if det != null:
		det.visible = visible_flag

func make_building_mesh_and_rect(building: Dictionary, mat: Material, base_col: Color = Color("d49a6a")) -> Dictionary:
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	surface.set_smooth_group(-1)
	var wall_faces := PackedVector3Array()
	var h: float = building.height_m
	var b_rect := Rect2()
	var has_rect := false
	var plinth_col := base_col.darkened(0.28)
	var spandrel_col := base_col.darkened(0.12)
	var cornice_col := base_col.lightened(0.28)
	var roof_col := base_col.darkened(0.36)
	var b_hash: int = absi(String(building.get("id", "")).hash())
	var glass_warm := Color("ffe494")
	var glass_amber := Color("f5b562")
	var glass_sky := Color("88c6d8")
	var storefront_glow := Color("ffe08a") if (b_hash % 2 == 0) else Color("8ce0e6")
	var awning_palette: Array[Color] = [
		Color("8f352e"), # Classic SF Burgundy Canopy
		Color("295e4a"), # Heritage Forest Awning
		Color("2d4c6e"), # Pacific Navy Marquee
		Color("b87830")  # Golden Ochre Awning
	]
	var awning_col: Color = awning_palette[b_hash % awning_palette.size()]
	if not building.polygons.is_empty() and not building.polygons[0].rings.is_empty():
		var r0: Array = building.polygons[0].rings[0]
		var c0 := Vector3.ZERO
		for rp0 in r0:
			c0 += point(rp0, 0.0)
		if not r0.is_empty():
			c0 /= float(r0.size())
		# Street-View-verified Tenderloin block & landmark color schemes
		if c0.x >= -18.0 and c0.x <= 28.0 and c0.z >= -36.0 and c0.z <= 12.0:
			# 101-111 Taylor St (Compton's Corner): ivory pilasters, powder-blue window bays, charcoal plinth, green 111 canopy
			base_col = Color("dfd9c8")
			spandrel_col = Color("87a6b8")
			plinth_col = Color("34393e")
			cornice_col = Color("383e42")
			awning_col = Color("265c42")
		elif c0.x > 28.0 and c0.x <= 92.0 and c0.z < -12.0 and c0.z >= -52.0:
			# 50-65 Turk St (North Side): modern faceted alabaster concrete with slate-blue ribbon bays & charcoal colonnade
			base_col = Color("dbd9d2")
			spandrel_col = Color("4a6b88")
			plinth_col = Color("282c30")
			cornice_col = Color("e8e6df")
			awning_col = Color("355269")
		elif c0.x > 25.0 and c0.x <= 95.0 and c0.z >= -12.0 and c0.z <= 28.0:
			# 45 Turk St (South Side): historic tan/sienna brick with mint-sage flat metal marquee
			base_col = Color("9c7a63")
			spandrel_col = Color("6e5544")
			plinth_col = Color("4c5750")
			cornice_col = Color("c2a68f")
			awning_col = Color("7a9682")
		elif c0.x >= -338.0 and c0.x <= -262.0 and c0.z >= -92.0 and c0.z <= -32.0:
			# 398 Eddy St (Cadillac Hotel & Tenderloin Museum): alabaster upper floors, olive-sage ground floor, vermilion museum signboard
			base_col = Color("ecebe4")
			spandrel_col = Color("d5d3c8")
			plinth_col = Color("727e68")
			cornice_col = Color("f6f5ef")
			awning_col = Color("d94234")
		elif c0.x >= -205.0 and c0.x <= -115.0 and c0.z >= -10.0 and c0.z <= 48.0:
			# 175-199 Turk St (at Jones): dusty blue-grey loft w/ white pilasters OR charcoal-bronze w/ redwood ground floor
			if (b_hash % 2) == 0:
				base_col = Color("8492a2")
				spandrel_col = Color("5d6a78")
				plinth_col = Color("2c3238")
				cornice_col = Color("dcdad2")
			else:
				base_col = Color("45484c")
				spandrel_col = Color("2f3236")
				plinth_col = Color("5c3324")
				cornice_col = Color("e6e4dc")
		elif String(building.get("name", "")).contains("TL Residences"):
			# 361 Turk St / 145 Leavenworth St (TL Residences, current OSM outlines; not in the 2010
			# footprints): warm terracotta-orange brick & sandy-buff wing
			base_col = Color("c66848") if (b_hash % 2 == 0) else Color("dfcba6")
			spandrel_col = base_col.darkened(0.15)
			plinth_col = Color("3a3532")
			cornice_col = Color("ebdcc0")
		elif c0.x < -365.0 and c0.z >= 15.0 and c0.z <= 80.0:
			# 430-447 Turk St (Dodge Alley block): lavender-slate Edwardian & seafoam-mint 3-story with navy windows
			if (b_hash % 2) == 0:
				base_col = Color("6e9b8d")
				spandrel_col = Color("23395d")
				plinth_col = Color("2b3d34")
				cornice_col = Color("383c3a")
			else:
				base_col = Color("7d808c")
				spandrel_col = Color("5c5f69")
				plinth_col = Color("494c54")
				cornice_col = Color("c5c7cc")
	var photo_pal: Dictionary = CREATOR_PHOTO_PALETTES.get(String(building.get("id", "")), {})
	if not photo_pal.is_empty():
		base_col = Color(String(photo_pal.base))
		spandrel_col = Color(String(photo_pal.spandrel))
		plinth_col = Color(String(photo_pal.plinth))
		cornice_col = Color(String(photo_pal.cornice))
		roof_col = base_col.darkened(0.36)
	# On-site Field Guide survey (scripts/apply-field-survey.mjs) overrides the palettes above.
	var survey := field_survey_style(String(building.get("id", "")))
	base_col = survey.get("base", base_col)
	spandrel_col = survey.get("spandrel", spandrel_col)
	plinth_col = survey.get("plinth", plinth_col)
	cornice_col = survey.get("cornice", cornice_col)
	var force_bays: bool = survey.get("force_bays", false)
	var force_awning: bool = survey.get("force_awning", false)
	var flat_marquee: bool = survey.get("flat_marquee", false)
	var force_fire_escape: bool = survey.get("force_fire_escape", false) or bool(photo_pal.get("fire_escape", false))
	var mezzanine: bool = survey.get("mezzanine", false)
	last_built_palette = {"id": String(building.get("id", "")), "base": base_col, "spandrel": spandrel_col, "plinth": plinth_col, "cornice": cornice_col, "surveyed": not survey.is_empty()}
	built_palettes[String(building.get("id", ""))] = last_built_palette
	var fire_escape_col := Color("2e3336") if (b_hash % 2 == 0) else Color("dcdad0")
	for polygon in building.polygons:
		for r_idx in range(polygon.rings.size()):
			var ring: Array = polygon.rings[r_idx]
			var ring_center := Vector3.ZERO
			for rp in ring:
				ring_center += point(rp, 0.0)
			if not ring.is_empty():
				ring_center /= float(ring.size())
			for i in range(ring.size()):
				var p0: Array = ring[i]
				var v2 := Vector2(p0[0], p0[1])
				if not has_rect:
					b_rect = Rect2(v2, Vector2.ZERO)
					has_rect = true
				else:
					b_rect = b_rect.expand(v2)
				var a := point(p0, 0)
				var b := point(ring[(i + 1) % ring.size()], 0)
				var bu := b + Vector3.UP * h
				var au := a + Vector3.UP * h
				wall_faces.append_array([a, b, bu, a, bu, au])
				var seg_len := a.distance_to(b)
				var seg_dir := (b - a).normalized() if seg_len > 1e-4 else Vector3.RIGHT
				var out_n := seg_dir.cross(Vector3.UP).normalized()
				var edge_mid := (a + b) * 0.5
				if (edge_mid + out_n * 0.5 - ring_center).length_squared() < (edge_mid - out_n * 0.5 - ring_center).length_squared():
					out_n = -out_n
				var plinth_h := minf(3.6, h * 0.30)
				var cornice_y := maxf(plinth_h, h - minf(0.95, h * 0.12))
				if r_idx > 0 or h < 5.0 or seg_len < 2.8:
					colored_quad(surface, a, b, b + Vector3.UP * plinth_h, a + Vector3.UP * plinth_h, plinth_col)
					if cornice_y > plinth_h:
						colored_quad(surface, a + Vector3.UP * plinth_h, b + Vector3.UP * plinth_h, b + Vector3.UP * cornice_y, a + Vector3.UP * cornice_y, base_col)
					if h > cornice_y:
						colored_quad(surface, a + Vector3.UP * cornice_y, b + Vector3.UP * cornice_y, bu, au, cornice_col)
				else:
					# Ground-floor storefront / masonry plinth + 3D sloped fabric awning
					if seg_len >= 4.2 and plinth_h >= 2.6:
						var s_a := a.lerp(b, 0.16)
						var s_b := a.lerp(b, 0.84)
						storefront_light_spots.append({"mid": Vector2(edge_mid.x, edge_mid.z), "normal": Vector2(out_n.x, out_n.z), "half_len": seg_len * 0.34, "glow": storefront_glow, "id": String(building.get("id", ""))})
						var sill_y := 0.65
						var head_y := plinth_h - 0.42
						colored_quad(surface, a, s_a, s_a + Vector3.UP * plinth_h, a + Vector3.UP * plinth_h, plinth_col)
						colored_quad(surface, s_b, b, b + Vector3.UP * plinth_h, s_b + Vector3.UP * plinth_h, plinth_col)
						colored_quad(surface, s_a, s_b, s_b + Vector3.UP * sill_y, s_a + Vector3.UP * sill_y, plinth_col)
						colored_quad(surface, s_a + Vector3.UP * sill_y, s_b + Vector3.UP * sill_y, s_b + Vector3.UP * head_y, s_a + Vector3.UP * head_y, glass_flag(storefront_glow, true))
						var transom_col := glass_warm.lerp(cornice_col, 0.35) if mezzanine else cornice_col
						colored_quad(surface, s_a + Vector3.UP * head_y, s_b + Vector3.UP * head_y, s_b + Vector3.UP * plinth_h, s_a + Vector3.UP * plinth_h, transom_col)
						if (seg_len >= 5.6 and ((b_hash + i) % 2 == 0)) or force_awning:
							var aw_top_a := s_a + Vector3.UP * (head_y + 0.30)
							var aw_top_b := s_b + Vector3.UP * (head_y + 0.30)
							var aw_drop := 0.0 if flat_marquee else 0.36
							var aw_reach := 0.85 if flat_marquee else 0.52
							var aw_tip_a := s_a + out_n * aw_reach + Vector3.UP * (head_y + 0.30 - aw_drop)
							var aw_tip_b := s_b + out_n * aw_reach + Vector3.UP * (head_y + 0.30 - aw_drop)
							colored_quad(surface, aw_tip_a, aw_tip_b, aw_top_b, aw_top_a, awning_col)
							colored_quad(surface, aw_tip_a + Vector3.DOWN * 0.12, aw_tip_b + Vector3.DOWN * 0.12, aw_tip_b, aw_tip_a, awning_col.darkened(0.22))
					else:
						colored_quad(surface, a, b, b + Vector3.UP * plinth_h, a + Vector3.UP * plinth_h, plinth_col)
					# Upper stories with 3D projecting SF bay windows, wrought-iron fire escapes, and spandrel bands
					var mid_h := cornice_y - plinth_h
					var num_stories := maxi(1, int(floor(mid_h / 3.2)))
					var story_h := mid_h / float(num_stories)
					var num_bays := clampi(int(floor(seg_len / 3.2)), 1, 7)
					var has_3d_bays := (seg_len >= 6.8 and h >= 8.2 and num_bays >= 2) or (force_bays and seg_len >= 4.5 and h >= 6.0)
					var fire_bay := num_bays / 2 if (seg_len >= 7.8 and num_stories >= 2) or (force_fire_escape and seg_len >= 4.5) else -1
					for s_i in range(num_stories):
						var sy0 := plinth_h + float(s_i) * story_h
						var sy1 := sy0 + story_h
						var wy0 := sy0 + story_h * 0.22
						var wy1 := sy0 + story_h * 0.78
						colored_quad(surface, a + Vector3.UP * sy0, b + Vector3.UP * sy0, b + Vector3.UP * wy0, a + Vector3.UP * wy0, spandrel_col)
						colored_quad(surface, a + Vector3.UP * wy1, b + Vector3.UP * wy1, b + Vector3.UP * sy1, a + Vector3.UP * sy1, base_col)
						for bay_i in range(num_bays):
							var t0 := float(bay_i) / float(num_bays)
							var t1 := float(bay_i + 1) / float(num_bays)
							var wt0 := lerpf(t0, t1, 0.22)
							var wt1 := lerpf(t0, t1, 0.78)
							var p_t0 := a.lerp(b, t0)
							var p_wt0 := a.lerp(b, wt0)
							var p_wt1 := a.lerp(b, wt1)
							var p_t1 := a.lerp(b, t1)
							var w_pick: int = (b_hash + i * 7 + s_i * 13 + bay_i * 5) % 5
							var win_col := glass_flag(glass_warm if w_pick <= 1 else (glass_amber if w_pick == 2 else glass_sky), ((b_hash / 3 + i * 11 + s_i * 7 + bay_i * 3) % 9) < 5)
							if bay_i == fire_bay:
								# 3D Wrought-Iron Fire Escape balcony platform & railing
								var fe_out := out_n * 0.50
								var fe_a := p_wt0 + fe_out + Vector3.UP * (sy0 + 0.08)
								var fe_b := p_wt1 + fe_out + Vector3.UP * (sy0 + 0.08)
								colored_quad(surface, p_wt0 + Vector3.UP * (sy0 + 0.08), p_wt1 + Vector3.UP * (sy0 + 0.08), fe_b, fe_a, fire_escape_col)
								colored_quad(surface, fe_a, fe_b, fe_b + Vector3.UP * 0.34, fe_a + Vector3.UP * 0.34, fire_escape_col)
							if has_3d_bays and (force_bays or (bay_i + b_hash) % 2 == 0) and bay_i != fire_bay:
								var bay_out := out_n * 0.38
								var b_wt0 := p_wt0 + bay_out
								var b_wt1 := p_wt1 + bay_out
								# Angled SF bay cheeks + projecting center window + bay spandrel
								colored_quad(surface, p_t0 + Vector3.UP * sy0, b_wt0 + Vector3.UP * sy0, b_wt0 + Vector3.UP * sy1, p_t0 + Vector3.UP * sy1, cornice_col.darkened(0.08))
								colored_quad(surface, b_wt1 + Vector3.UP * sy0, p_t1 + Vector3.UP * sy0, p_t1 + Vector3.UP * sy1, b_wt1 + Vector3.UP * sy1, cornice_col.darkened(0.14))
								colored_quad(surface, b_wt0 + Vector3.UP * sy0, b_wt1 + Vector3.UP * sy0, b_wt1 + Vector3.UP * wy0, b_wt0 + Vector3.UP * wy0, spandrel_col)
								colored_quad(surface, b_wt0 + Vector3.UP * wy0, b_wt1 + Vector3.UP * wy0, b_wt1 + Vector3.UP * wy1, b_wt0 + Vector3.UP * wy1, win_col)
								colored_quad(surface, b_wt0 + Vector3.UP * wy1, b_wt1 + Vector3.UP * wy1, b_wt1 + Vector3.UP * sy1, b_wt0 + Vector3.UP * sy1, cornice_col)
								if s_i == num_stories - 1:
									colored_quad(surface, p_wt0 + Vector3.UP * sy1, p_wt1 + Vector3.UP * sy1, b_wt1 + Vector3.UP * sy1, b_wt0 + Vector3.UP * sy1, cornice_col)
							else:
								colored_quad(surface, p_t0 + Vector3.UP * wy0, p_wt0 + Vector3.UP * wy0, p_wt0 + Vector3.UP * wy1, p_t0 + Vector3.UP * wy1, base_col)
								colored_quad(surface, p_wt0 + Vector3.UP * wy0, p_wt1 + Vector3.UP * wy0, p_wt1 + Vector3.UP * wy1, p_wt0 + Vector3.UP * wy1, win_col)
								colored_quad(surface, p_wt1 + Vector3.UP * wy0, p_t1 + Vector3.UP * wy0, p_t1 + Vector3.UP * wy1, p_wt1 + Vector3.UP * wy1, base_col)
					# 3D projecting top cornice crown
					if h > cornice_y:
						var c_out := out_n * 0.22
						colored_quad(surface, a + c_out + Vector3.UP * cornice_y, b + c_out + Vector3.UP * cornice_y, bu + c_out, au + c_out, cornice_col)
						colored_quad(surface, au, bu, bu + c_out, au + c_out, cornice_col.lightened(0.12))
		for i in range(0, polygon.triangles.size(), 3):
			surface.set_color(roof_col)
			surface.add_vertex(point(polygon.vertices[polygon.triangles[i]], h))
			surface.set_color(roof_col)
			surface.add_vertex(point(polygon.vertices[polygon.triangles[i + 1]], h))
			surface.set_color(roof_col)
			surface.add_vertex(point(polygon.vertices[polygon.triangles[i + 2]], h))
	surface.generate_normals()
	var building_mesh := MeshInstance3D.new()
	building_mesh.name = building.id
	building_mesh.mesh = surface.commit()
	building_mesh.material_override = mat
	var body := StaticBody3D.new()
	body.name = "StaticBody3D"
	var col := CollisionShape3D.new()
	var concave := ConcavePolygonShape3D.new()
	concave.set_faces(wall_faces)
	col.shape = concave
	body.add_child(col)
	building_mesh.add_child(body)
	var details := build_rooftop_details(building, h, {"base": base_col, "spandrel": spandrel_col, "plinth": plinth_col, "cornice": cornice_col, "roof": roof_col, "survey": survey})
	if details != null:
		building_mesh.add_child(details)
	add_child(building_mesh)
	return {"mesh": building_mesh, "rect": b_rect}

## On the Web the canvas renders at device pixels (window.devicePixelRatio). Lay the UI out in CSS
## pixels so phones get the narrow layout, readable text, and >= 44 px touch targets; 3D still
## renders at full device resolution.
func apply_device_pixel_ratio() -> float:
	var dpr := 1.0
	if OS.has_feature("web"):
		dpr = clampf(DisplayServer.screen_get_scale(), 1.0, 4.0)
	if get_tree() != null and get_tree().root != null and dpr > 1.01:
		get_tree().root.content_scale_factor = dpr
	return dpr

func _ready() -> void:
	apply_device_pixel_ratio()
	save_path = resolve_save_path()
	settings_path = resolve_settings_path()
	var parsed = JSON.parse_string(FileAccess.get_file_as_string("res://data/buildings.json"))
	if not parsed is Dictionary or not parsed.has("buildings") or parsed.buildings.is_empty():
		set_physics_process(false)
		set_process_unhandled_input(false)
		push_error("Missing/invalid city geometry. Run node scripts/build-godot-data.mjs.")
		return
	data = parsed
	load_lidar_data()
	wall_material = material(Color("c4b6a1"))
	chosen_material = material(Color("75bbb2"))
	cutaway_material = translucent_material(Color(0.77, 0.71, 0.63, 0.22))
	var palette: Array[Color] = [
		Color("cf6d51"), # Brick Terracotta
		Color("dfb360"), # Warm Golden Ochre
		Color("589a9c"), # Victorian Bay Teal
		Color("e3d1b0"), # Edwardian Cream & Gold
		Color("c8766c"), # Mission Coral Rose
		Color("62849e"), # Classic Bay Slate Blue
		Color("d98e4e"), # Sunlit Amber Stucco
		Color("739c82")  # Sage Patina
	]
	var wider_palette: Array[Color] = [
		Color("c4684e"), # Terracotta Masonry
		Color("d4a85a"), # Sandstone Gold
		Color("528e91"), # Seafoam Victorian
		Color("d8c5a4"), # Edwardian Buff
		Color("ba6e65"), # Rose Sienna
		Color("5c7b94"), # Slate Blue
		Color("cc8549"), # Warm Copper Ochre
		Color("6c9179")  # Bay Laurel Green
	]
	var environment := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("172a2e")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("f2ead8")
	env.ambient_light_energy = 0.72
	environment.environment = env
	add_child(environment)
	world_env = env
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-55, -25, 0)
	sun.light_energy = 1.25
	add_child(sun)
	sun_light = sun
	var rim_sun := DirectionalLight3D.new()
	rim_sun.rotation_degrees = Vector3(-38, 145, 0)
	rim_sun.light_color = Color("ffd8a6")
	rim_sun.light_energy = 0.48
	add_child(rim_sun)
	rim_light = rim_sun
	var ground := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = Vector2(960, 560)
	ground.mesh = plane
	ground.material_override = material(Color("566a63"))
	ground.position = Vector3(-130, -0.1, 15)
	add_child(ground)
	build_streets()
	build_district_boundary()
	compute_street_intersections()
	compute_corner_tower_sites()
	for idx in range(data.buildings.size()):
		var building: Dictionary = data.buildings[idx]
		var base_c: Color = palette[idx % palette.size()]
		var b_mat := building_material()
		building_materials.append(b_mat)
		var built := make_building_mesh_and_rect(building, b_mat, base_c)
		var b_mesh: MeshInstance3D = built.mesh
		var b_rect: Rect2 = built.rect
		if is_superseded_building(String(building.id)):
			hide_superseded_building(b_mesh)
		meshes.append(b_mesh)
		building_rects.append(b_rect)
		all_buildings.append(building)
		all_building_rects.append(b_rect)
	var wider_list: Array = data.get("wider_buildings", [])
	for w_idx in range(wider_list.size()):
		var w_building: Dictionary = wider_list[w_idx]
		var w_base_c: Color = wider_palette[w_idx % wider_palette.size()]
		var w_mat := building_material()
		wider_building_materials.append(w_mat)
		var w_built := make_building_mesh_and_rect(w_building, w_mat, w_base_c)
		var w_mesh: MeshInstance3D = w_built.mesh
		var w_rect: Rect2 = w_built.rect
		if is_superseded_building(String(w_building.id)):
			hide_superseded_building(w_mesh)
		wider_meshes.append(w_mesh)
		wider_building_rects.append(w_rect)
		all_buildings.append(w_building)
		all_building_rects.append(w_rect)
	build_current_buildings()
	if not all_building_rects.is_empty():
		var b_union := all_building_rects[0]
		for br in all_building_rects:
			b_union = b_union.merge(br)
		walk_bounds = b_union.grow(14.0)
	build_west_intersections()
	build_history_stops()
	surprise_keepsake_nodes.clear()
	build_neighbors_and_player()
	build_mural_board()
	build_rook_speaker()
	build_block_banner()
	build_street_life_decor()
	build_creator_rooftops()
	load_street_tree_data()
	build_muni_overhead_lines()
	build_boeddeker_park()
	build_light_pools()
	build_street_trees()
	build_eatery_counters()
	build_neighborhood_surprises()
	build_gathering_layouts()
	ensure_speech_bubble()
	build_guide_marker()
	build_talk_prompt()
	build_celebration_burst()
	apply_time_of_day()
	build_audio_players()
	camera = Camera3D.new()
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	add_child(camera)
	camera.current = true
	update_camera()
	make_ui()
	setup_web_audio_bridge()
	setup_web_a11y_bridge()
	load_godot_state()
	load_godot_settings()
	await get_tree().process_frame
	await get_tree().process_frame
	overview()
	# Opening story card for the current chapter, shown after the startup overview settles.
	var start_chapter := current_chapter()
	last_story_chapter = int(start_chapter.num)
	show_story_card(start_chapter, true)
	# Headless parser/import tests don't pretend to render a screenshot.
	if "--capture" in OS.get_cmdline_user_args():
		await get_tree().process_frame
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png(ProjectSettings.globalize_path("res://").path_join("../artifacts/godot-massing.png"))
		get_tree().quit()

func build_streets() -> void:
	street_ways = data.get("wider_streets", data.streets)
	street_way_rects.clear()
	var curb_surface := SurfaceTool.new()
	curb_surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	var bikelane_surface := SurfaceTool.new()
	bikelane_surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	for street in street_ways:
		var s_rect := Rect2()
		var has_s_rect := false
		for p in street.points:
			var pv := Vector2(p[0], p[1])
			if not has_s_rect:
				s_rect = Rect2(pv, Vector2.ZERO)
				has_s_rect = true
			else:
				s_rect = s_rect.expand(pv)
		street_way_rects.append(s_rect)
		var sidewalk := SurfaceTool.new()
		sidewalk.begin(Mesh.PRIMITIVE_TRIANGLES)
		var road_surface := SurfaceTool.new()
		road_surface.begin(Mesh.PRIMITIVE_TRIANGLES)
		var stripe_surface := SurfaceTool.new()
		stripe_surface.begin(Mesh.PRIMITIVE_TRIANGLES)
		var is_turk := String(street.get("name", "")).to_lower().contains("turk")
		for i in range(street.points.size() - 1):
			var a_sw := point(street.points[i], 0.01)
			var b_sw := point(street.points[i + 1], 0.01)
			var dir := (b_sw - a_sw).normalized()
			var across_sw := dir.cross(Vector3.UP) * 8.2
			triangle(sidewalk, a_sw - across_sw, b_sw - across_sw, b_sw + across_sw)
			triangle(sidewalk, a_sw - across_sw, b_sw + across_sw, a_sw + across_sw)
			var a := point(street.points[i], 0.025)
			var b := point(street.points[i + 1], 0.025)
			var across := dir.cross(Vector3.UP) * 5.0
			triangle(road_surface, a - across, b - across, b + across)
			triangle(road_surface, a - across, b + across, a + across)
			# Raised curb bands along both road edges
			var c_in := dir.cross(Vector3.UP) * 4.88
			var c_out := dir.cross(Vector3.UP) * 5.22
			var a_cb := point(street.points[i], 0.052)
			var b_cb := point(street.points[i + 1], 0.052)
			triangle(curb_surface, a_cb + c_in, b_cb + c_in, b_cb + c_out)
			triangle(curb_surface, a_cb + c_in, b_cb + c_out, a_cb + c_out)
			triangle(curb_surface, a_cb - c_out, b_cb - c_out, b_cb - c_in)
			triangle(curb_surface, a_cb - c_out, b_cb - c_in, a_cb - c_in)
			if is_turk:
				var bl_in := dir.cross(Vector3.UP) * 2.95
				var bl_out := dir.cross(Vector3.UP) * 4.45
				var a_bl := point(street.points[i], 0.032)
				var b_bl := point(street.points[i + 1], 0.032)
				triangle(bikelane_surface, a_bl - bl_out, b_bl - bl_out, b_bl - bl_in)
				triangle(bikelane_surface, a_bl - bl_out, b_bl - bl_in, a_bl - bl_in)
			var a_st := point(street.points[i], 0.035)
			var b_st := point(street.points[i + 1], 0.035)
			var across_st := dir.cross(Vector3.UP) * 0.16
			triangle(stripe_surface, a_st - across_st, b_st - across_st, b_st + across_st)
			triangle(stripe_surface, a_st - across_st, b_st + across_st, a_st + across_st)
		sidewalk.generate_normals()
		var sw_mesh := MeshInstance3D.new()
		sw_mesh.mesh = sidewalk.commit()
		sw_mesh.material_override = material(Color("8a8577"))
		add_child(sw_mesh)
		road_surface.generate_normals()
		var road := MeshInstance3D.new()
		road.mesh = road_surface.commit()
		road.material_override = material(Color("263e43"))
		add_child(road)
		stripe_surface.generate_normals()
		var stripe := MeshInstance3D.new()
		stripe.mesh = stripe_surface.commit()
		stripe.material_override = material(Color("e2d5b5"))
		add_child(stripe)
	curb_surface.generate_normals()
	var curb_mesh := MeshInstance3D.new()
	curb_mesh.name = "StreetCurbs"
	curb_mesh.mesh = curb_surface.commit()
	curb_mesh.material_override = material(Color("b5aea0"))
	add_child(curb_mesh)
	bikelane_surface.generate_normals()
	var bike_mesh := MeshInstance3D.new()
	bike_mesh.name = "TurkProtectedBikeLane"
	bike_mesh.mesh = bikelane_surface.commit()
	bike_mesh.material_override = material(Color("2e7d5b"))
	add_child(bike_mesh)
	# Continental white zebra crosswalks and yellow tactile ADA curb ramp pads at key intersections
	var xwalk_surface := SurfaceTool.new()
	xwalk_surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	var ada_surface := SurfaceTool.new()
	ada_surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	var xwalk_centers: Array[Vector3] = [
		Vector3(0.0, 0.04, 0.0),
		Vector3(134.8, 0.04, -21.1),
		Vector3(-145.6, 0.04, 22.8),
		Vector3(-291.5, 0.04, 45.7),
		Vector3(-437.3, 0.04, 68.6)
	]
	for xc in xwalk_centers:
		for bar_i in range(-3, 4):
			var bar_off := float(bar_i) * 1.15
			var e_c := xc + Vector3(7.2, 0.0, bar_off)
			var w_c := xc + Vector3(-7.2, 0.0, bar_off)
			var bw := Vector3(1.35, 0.0, 0.0)
			var bh := Vector3(0.0, 0.0, 0.28)
			triangle(xwalk_surface, e_c - bw - bh, e_c + bw - bh, e_c + bw + bh)
			triangle(xwalk_surface, e_c - bw - bh, e_c + bw + bh, e_c - bw + bh)
			triangle(xwalk_surface, w_c - bw - bh, w_c + bw - bh, w_c + bw + bh)
			triangle(xwalk_surface, w_c - bw - bh, w_c + bw + bh, w_c - bw + bh)
		for sx in [-1.0, 1.0]:
			for sz in [-1.0, 1.0]:
				var pad_c := xc + Vector3(sx * 5.6, 0.018, sz * 5.2)
				var pw := Vector3(0.65, 0.0, 0.0)
				var ph := Vector3(0.0, 0.0, 0.65)
				triangle(ada_surface, pad_c - pw - ph, pad_c + pw - ph, pad_c + pw + ph)
				triangle(ada_surface, pad_c - pw - ph, pad_c + pw + ph, pad_c - pw + ph)
	xwalk_surface.generate_normals()
	var xwalk_mesh := MeshInstance3D.new()
	xwalk_mesh.name = "ContinentalCrosswalks"
	xwalk_mesh.mesh = xwalk_surface.commit()
	xwalk_mesh.material_override = material(Color("ede6d6"))
	add_child(xwalk_mesh)
	ada_surface.generate_normals()
	var ada_mesh := MeshInstance3D.new()
	ada_mesh.name = "TactileCurbRamps"
	ada_mesh.mesh = ada_surface.commit()
	ada_mesh.material_override = material(Color("e8bf3a"))
	add_child(ada_mesh)
	build_street_name_signs()

func build_street_name_signs() -> void:
	street_signs_root = Node3D.new()
	street_signs_root.name = "StreetNameSigns"
	var corridor_banners: Array[Dictionary] = [
		{"name": "StreetBanner_TurkOpening", "text": "« TURK STREET (Opening Block) »", "pos": Vector3(52.0, 2.8, -11.5), "tint": Color("b8f8eb")},
		{"name": "StreetBanner_TurkEast", "text": "« TURK STREET (at Mason) »", "pos": Vector3(118.0, 2.8, -21.0), "tint": Color("b8f8eb")},
		{"name": "StreetBanner_Turk100", "text": "« TURK STREET (100 Block) »", "pos": Vector3(-72.0, 2.8, 11.5), "tint": Color("b8f8eb")},
		{"name": "StreetBanner_Turk200", "text": "« TURK STREET (200–300 Block) »", "pos": Vector3(-225.0, 2.8, 34.5), "tint": Color("b8f8eb")},
		{"name": "StreetBanner_Turk400", "text": "« TURK STREET (400 Block) »", "pos": Vector3(-372.0, 2.8, 57.5), "tint": Color("b8f8eb")},
		{"name": "StreetBanner_TaylorSouth", "text": "| TAYLOR STREET |", "pos": Vector3(4.5, 2.8, 19.0), "tint": Color("ffe999")},
		{"name": "StreetBanner_TaylorNorth", "text": "| TAYLOR STREET |", "pos": Vector3(-12.0, 2.8, -52.0), "tint": Color("ffe999")},
		{"name": "StreetBanner_Mason", "text": "| MASON STREET |", "pos": Vector3(136.0, 2.8, -10.0), "tint": Color("ffe999")},
		{"name": "StreetBanner_EddyEast", "text": "« EDDY STREET (East) »", "pos": Vector3(42.0, 2.8, -96.0), "tint": Color("b8f8eb")},
		{"name": "StreetBanner_EddyWest", "text": "« EDDY STREET (300 Block · Museum Row) »", "pos": Vector3(-235.0, 2.8, -68.0), "tint": Color("b8f8eb")},
		{"name": "StreetBanner_Jones", "text": "| JONES STREET |", "pos": Vector3(-156.0, 2.8, -22.0), "tint": Color("ffe999")},
		{"name": "StreetBanner_Leavenworth", "text": "| LEAVENWORTH STREET |", "pos": Vector3(-302.0, 2.8, -12.0), "tint": Color("ffe999")},
		{"name": "StreetBanner_Hyde", "text": "| HYDE STREET |", "pos": Vector3(-442.0, 2.8, 12.0), "tint": Color("ffe999")},
		{"name": "StreetBanner_DodgeAlley", "text": "~ DODGE ALLEY (Dodge Pl) ~", "pos": Vector3(-414.0, 2.8, 42.0), "tint": Color("ffd97d")}
	]
	for item in corridor_banners:
		var lbl := make_label_3d(String(item.name), String(item.text), item.pos, item.tint, 0.0155, 30)
		lbl.outline_size = 14
		street_signs_root.add_child(lbl)
	var opening_corners: Array[Dictionary] = [
		{"name": "CornerSign_TurkTaylor", "label": "Turk & Taylor", "pos": Vector3(3.8, 0.0, -4.2)},
		{"name": "CornerSign_TurkMason", "label": "Turk & Mason", "pos": Vector3(132.0, 0.0, -24.5)}
	]
	for corner in opening_corners:
		var c_node := Node3D.new()
		c_node.name = String(corner.name)
		c_node.position = corner.pos
		var post_inst := MeshInstance3D.new()
		var post_box := BoxMesh.new()
		post_box.size = Vector3(0.16, 3.2, 0.16)
		post_inst.mesh = post_box
		post_inst.position = Vector3(0.0, 1.6, 0.0)
		post_inst.material_override = material(Color("455357"))
		c_node.add_child(post_inst)
		var blade_inst := MeshInstance3D.new()
		var blade_box := BoxMesh.new()
		blade_box.size = Vector3(2.1, 0.38, 0.18)
		blade_inst.mesh = blade_box
		blade_inst.position = Vector3(0.0, 3.3, 0.0)
		blade_inst.material_override = mural_material(Color("2f8f83"))
		c_node.add_child(blade_inst)
		var sign_lbl := make_label_3d("CornerSignLabel", String(corner.label), Vector3(0.0, 3.95, 0.0), Color("d6fff6"), 0.015, 28)
		sign_lbl.outline_size = 14
		c_node.add_child(sign_lbl)
		street_signs_root.add_child(c_node)
	add_child(street_signs_root)

func build_district_boundary() -> void:
	district_boundary_node = MeshInstance3D.new()
	district_boundary_node.name = "DistrictBoundaryRibbon"
	var cd: Dictionary = data.get("cultural_district", {})
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_smooth_group(-1)
	var polys: Array = cd.get("polygons", [])
	for poly in polys:
		var rings: Array = poly.get("rings", [])
		for ring in rings:
			var r_size: int = ring.size()
			for i in range(r_size):
				var p0: Array = ring[i]
				var p1: Array = ring[(i + 1) % r_size]
				var a := point(p0, 0.045)
				var b := point(p1, 0.045)
				var seg := b - a
				if seg.length_squared() < 1e-6:
					continue
				var across := seg.normalized().cross(Vector3.UP) * 0.90
				triangle(st, a - across, b - across, b + across)
				triangle(st, a - across, b + across, a + across)
				var au := a + Vector3.UP * 0.35
				var bu := b + Vector3.UP * 0.35
				triangle(st, a, b, bu)
				triangle(st, a, bu, au)
	st.generate_normals()
	district_boundary_node.mesh = st.commit()
	district_boundary_node.material_override = mural_material(Color("d484b4"))
	district_boundary_node.visible = district_boundary_visible
	add_child(district_boundary_node)

func update_district_boundary_3d() -> void:
	if district_boundary_node != null:
		district_boundary_node.visible = district_boundary_visible

func make_label_3d(node_name: String, text_str: String, pos: Vector3, tint: Color = Color("fff6df"), pixel_sz: float = 0.0115, font_sz: int = 24) -> Label3D:
	var lbl := Label3D.new()
	lbl.name = node_name
	lbl.text = text_str
	lbl.position = pos
	lbl.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	lbl.no_depth_test = true
	if node_name in ["Nameplate", "HistoryStopLabel", "MuralBoardLabel", "RookSpeakerLabel", "ConcertBannerLabel", "AwningLabel361Turk", "MuseumHubLabel", "TimePortalLabel", "BoeddekerParkLabel", "CounterMenuLabel", "SurpriseLabel"] or node_name.begins_with("EateryLabel_"):
		lbl.set_meta("map_pixel_size", pixel_sz)
		lbl.set_meta("full_text", text_str)
		readable_scene_labels.append(lbl)
	lbl.render_priority = 8 # World text stays behind opaque speech backgrounds (10/11).
	lbl.pixel_size = pixel_sz
	lbl.font_size = font_sz
	lbl.outline_size = 12
	lbl.modulate = tint
	lbl.outline_modulate = Color(0.05, 0.09, 0.12, 0.98)
	return lbl

func build_west_intersections() -> void:
	west_intersection_nodes.clear()
	var list: Array = data.get("west_intersections", [])
	for item in list:
		var int_id := String(item.get("id", ""))
		var int_label := String(item.get("label", int_id.replace("turk-", "Turk & ").capitalize()))
		var pt: Array = item.get("point", [0.0, 0.0])
		var root_n := Node3D.new()
		root_n.name = "WestIntersection_%s" % int_id
		root_n.position = Vector3(float(pt[0]), 0.0, float(pt[1]))
		var ring_inst := MeshInstance3D.new()
		var cyl := CylinderMesh.new()
		cyl.top_radius = 1.65
		cyl.bottom_radius = 1.65
		cyl.height = 0.03
		ring_inst.mesh = cyl
		ring_inst.position = Vector3(0.0, 0.042, 0.0)
		ring_inst.material_override = material(Color("d8c8a8"))
		root_n.add_child(ring_inst)
		var post_inst := MeshInstance3D.new()
		var post_box := BoxMesh.new()
		post_box.size = Vector3(0.16, 3.2, 0.16)
		post_inst.mesh = post_box
		post_inst.position = Vector3(4.2, 1.6, -4.2)
		post_inst.material_override = material(Color("455357"))
		root_n.add_child(post_inst)
		var blade_inst := MeshInstance3D.new()
		blade_inst.name = "StreetSignBlade"
		var blade_box := BoxMesh.new()
		blade_box.size = Vector3(2.15, 0.38, 0.18)
		blade_inst.mesh = blade_box
		blade_inst.position = Vector3(4.2, 3.3, -4.2)
		blade_inst.material_override = mural_material(Color("2f8f83"))
		root_n.add_child(blade_inst)
		var west_lbl := make_label_3d("StreetSignLabel", int_label, Vector3(4.2, 3.95, -4.2), Color("d6fff6"), 0.015, 28)
		west_lbl.outline_size = 14
		root_n.add_child(west_lbl)
		add_child(root_n)
		west_intersection_nodes.append(root_n)

func build_history_stops() -> void:
	history_stop_nodes.clear()
	history_beacon_meshes.clear()
	var stops: Array = data.get("history_stops", [])
	for stop in stops:
		var stop_id := String(stop.get("id", ""))
		var pt: Array = stop.get("pos", stop.get("point", [0.0, 0.0]))
		var s_node := Node3D.new()
		s_node.name = "HistoryStop_%s" % stop_id
		s_node.position = Vector3(float(pt[0]), 0.0, float(pt[1]))
		var ring_inst := MeshInstance3D.new()
		var cyl := CylinderMesh.new()
		cyl.top_radius = 0.78
		cyl.bottom_radius = 0.78
		cyl.height = 0.04
		ring_inst.mesh = cyl
		ring_inst.position = Vector3(0.0, 0.02, 0.0)
		ring_inst.material_override = material(Color("e6d7b8"))
		s_node.add_child(ring_inst)
		var ped_inst := MeshInstance3D.new()
		var ped_box := BoxMesh.new()
		ped_box.size = Vector3(0.42, 1.24, 0.30)
		ped_inst.mesh = ped_box
		ped_inst.position = Vector3(0.0, 0.62, 0.0)
		ped_inst.material_override = material(Color("4a3d33"))
		s_node.add_child(ped_inst)
		var plaque_inst := MeshInstance3D.new()
		plaque_inst.name = "HistoryPlaque"
		var plaque_box := BoxMesh.new()
		plaque_box.size = Vector3(0.76, 0.48, 0.14)
		plaque_inst.mesh = plaque_box
		plaque_inst.position = Vector3(0.0, 1.34, 0.0)
		plaque_inst.material_override = material(Color("c89d54"))
		s_node.add_child(plaque_inst)
		var beacon := MeshInstance3D.new()
		beacon.name = "HistoryBeacon"
		var b_cyl := CylinderMesh.new()
		b_cyl.top_radius = 0.22
		b_cyl.bottom_radius = 0.22
		b_cyl.height = 0.28
		beacon.mesh = b_cyl
		beacon.position = Vector3(0.0, 1.76, 0.0)
		s_node.add_child(beacon)
		var stop_label := "Compton's Cafeteria (1966)" if stop_id == "comptons" else "The Black Hawk (1949–63)"
		var stop_tint := Color("ffe394") if stop_id == "comptons" else Color("9ef5e5")
		s_node.add_child(make_label_3d("HistoryStopLabel", stop_label, Vector3(0.0, 2.32, 0.0), stop_tint, 0.0115, 23))
		history_stop_nodes[stop_id] = s_node
		history_beacon_meshes[stop_id] = beacon
		add_child(s_node)
	update_history_stops_3d()

func update_history_stops_3d() -> void:
	for stop_id in HISTORY_STOP_IDS:
		if not history_beacon_meshes.has(stop_id):
			continue
		var beacon: MeshInstance3D = history_beacon_meshes[stop_id]
		var discovered := history_read if stop_id == "comptons" else blackhawk_discovered
		if discovered:
			beacon.material_override = mural_material(Color("f8cc58") if stop_id == "comptons" else Color("5fd4ba"))
		else:
			beacon.material_override = material(Color("8a7964"))

func attach_neighbor_signature_prop(n_node: Node3D, n_id: String) -> void:
	var prop := Node3D.new()
	prop.name = "NeighborProp"
	match n_id:
		"bea":
			# Rollator walker (#496557 frame + dark wheels) matching public/keepsake.js
			var bar := MeshInstance3D.new()
			var bar_box := BoxMesh.new()
			bar_box.size = Vector3(0.50, 0.05, 0.05)
			bar.mesh = bar_box
			bar.position = Vector3(0.0, 0.78, 0.34)
			bar.material_override = material(Color("496557"))
			prop.add_child(bar)
			for side_x in [-0.22, 0.22]:
				var leg := MeshInstance3D.new()
				var leg_box := BoxMesh.new()
				leg_box.size = Vector3(0.05, 0.72, 0.05)
				leg.mesh = leg_box
				leg.position = Vector3(side_x, 0.40, 0.34)
				leg.material_override = material(Color("496557"))
				prop.add_child(leg)
				var wheel := MeshInstance3D.new()
				var w_cyl := CylinderMesh.new()
				w_cyl.top_radius = 0.08
				w_cyl.bottom_radius = 0.08
				w_cyl.height = 0.04
				wheel.mesh = w_cyl
				wheel.rotation_degrees = Vector3(0.0, 0.0, 90.0)
				wheel.position = Vector3(side_x, 0.08, 0.36)
				wheel.material_override = material(Color("24312b"))
				prop.add_child(wheel)
			bea_mayor_ribbon_node = Node3D.new()
			bea_mayor_ribbon_node.name = "MayorRibbonRosette"
			bea_mayor_ribbon_node.position = Vector3(-0.14, 0.78, 0.38)
			bea_mayor_ribbon_node.visible = false
			var ros_ring := add_prop_mesh(bea_mayor_ribbon_node, prop_cylinder(0.065, 0.065, 0.024), Vector3.ZERO, mural_material(Color("d93848")), "RosetteRing")
			ros_ring.rotation_degrees = Vector3(90.0, 0.0, 0.0)
			var ros_seal := add_prop_mesh(bea_mayor_ribbon_node, prop_cylinder(0.038, 0.038, 0.030), Vector3(0.0, 0.0, 0.008), mural_material(Color("ffd45e")), "RosetteGoldSeal")
			ros_seal.rotation_degrees = Vector3(90.0, 0.0, 0.0)
			var tail_l := add_prop_mesh(bea_mayor_ribbon_node, prop_box(Vector3(0.032, 0.11, 0.014)), Vector3(-0.022, -0.075, -0.004), mural_material(Color("d93848")), "RibbonTailLeft")
			tail_l.rotation_degrees = Vector3(0.0, 0.0, 14.0)
			var tail_r := add_prop_mesh(bea_mayor_ribbon_node, prop_box(Vector3(0.032, 0.11, 0.014)), Vector3(0.022, -0.075, -0.004), mural_material(Color("ffd45e")), "RibbonTailRight")
			tail_r.rotation_degrees = Vector3(0.0, 0.0, -14.0)
			prop.add_child(bea_mayor_ribbon_node)
			surprise_keepsake_nodes["mayor_pomp_event"] = bea_mayor_ribbon_node
			bea_treat_box_node = Node3D.new()
			bea_treat_box_node.name = "BakeryTreatBox"
			bea_treat_box_node.position = Vector3(0.0, 0.54, 0.35)
			bea_treat_box_node.visible = false
			add_prop_mesh(bea_treat_box_node, prop_box(Vector3(0.30, 0.04, 0.20)), Vector3.ZERO, material(Color("f5d6df")), "BakeryBoxTray")
			add_prop_mesh(bea_treat_box_node, prop_cylinder(0.058, 0.058, 0.032), Vector3(-0.068, 0.034, 0.0), mural_material(Color("ff9ec4")), "MiniPinkDonut")
			add_prop_mesh(bea_treat_box_node, prop_cylinder(0.058, 0.058, 0.032), Vector3(0.068, 0.034, 0.0), material(Color("c9935b")), "MiniEverythingBagel")
			add_prop_mesh(bea_treat_box_node, prop_cylinder(0.040, 0.040, 0.038), Vector3(0.068, 0.038, 0.0), mural_material(Color("f7f2e4")), "BagelCreamCheese")
			prop.add_child(bea_treat_box_node)
			surprise_keepsake_nodes["good_donut_and_bagel"] = bea_treat_box_node
		"celeste":
			# Painter palette with 3 bright motif paint dabs + brush
			var pal := MeshInstance3D.new()
			var pal_box := BoxMesh.new()
			pal_box.size = Vector3(0.32, 0.04, 0.24)
			pal.mesh = pal_box
			pal.position = Vector3(0.34, 0.96, 0.18)
			pal.material_override = material(Color("d8b48a"))
			prop.add_child(pal)
			var dab_cols: Array[Color] = [Color("f8cc58"), Color("5fd4ba"), Color("ee835c")]
			for d_i in range(dab_cols.size()):
				var dab := MeshInstance3D.new()
				var dab_box := BoxMesh.new()
				dab_box.size = Vector3(0.06, 0.03, 0.06)
				dab.mesh = dab_box
				dab.position = Vector3(0.26 + float(d_i) * 0.08, 0.99, 0.18)
				dab.material_override = mural_material(dab_cols[d_i])
				prop.add_child(dab)
		"rook":
			# Sunburst archtop guitar slung at Rook's side
			var body_m := MeshInstance3D.new()
			var body_cyl := CylinderMesh.new()
			body_cyl.top_radius = 0.19
			body_cyl.bottom_radius = 0.19
			body_cyl.height = 0.07
			body_m.mesh = body_cyl
			body_m.rotation_degrees = Vector3(90.0, 0.0, -18.0)
			body_m.position = Vector3(0.24, 0.90, 0.20)
			body_m.material_override = material(Color("c87d44"))
			prop.add_child(body_m)
			var neck_m := MeshInstance3D.new()
			var neck_box := BoxMesh.new()
			neck_box.size = Vector3(0.06, 0.44, 0.04)
			neck_m.mesh = neck_box
			neck_m.rotation_degrees = Vector3(0.0, 0.0, -28.0)
			neck_m.position = Vector3(0.08, 1.12, 0.22)
			neck_m.material_override = material(Color("4a3525"))
			prop.add_child(neck_m)
		"dez":
			# Golden studio headphones (#dfc57f) matching public/keepsake.js + field notebook
			for ear_x in [-0.20, 0.20]:
				var cup := MeshInstance3D.new()
				var cup_cyl := CylinderMesh.new()
				cup_cyl.top_radius = 0.06
				cup_cyl.bottom_radius = 0.06
				cup_cyl.height = 0.04
				cup.mesh = cup_cyl
				cup.rotation_degrees = Vector3(0.0, 0.0, 90.0)
				cup.position = Vector3(ear_x, 1.48, 0.0)
				cup.material_override = mural_material(Color("dfc57f"))
				prop.add_child(cup)
			var notebook := MeshInstance3D.new()
			var nb_box := BoxMesh.new()
			nb_box.size = Vector3(0.18, 0.24, 0.04)
			notebook.mesh = nb_box
			notebook.position = Vector3(-0.32, 0.96, 0.18)
			notebook.material_override = material(Color("5fb8a6"))
			prop.add_child(notebook)
			dez_viking_charm_node = Node3D.new()
			dez_viking_charm_node.name = "VikingHornCharm"
			dez_viking_charm_node.position = Vector3(-0.32, 0.96, 0.22)
			dez_viking_charm_node.visible = false
			add_prop_mesh(dez_viking_charm_node, prop_sphere(0.052), Vector3.ZERO, mural_material(Color("c8cfd8")), "MiniVikingDome")
			add_prop_mesh(dez_viking_charm_node, prop_cylinder(0.055, 0.055, 0.018), Vector3(0.0, -0.01, 0.0), mural_material(Color("ffb35c")), "MiniVikingBand")
			for h_side in [-1.0, 1.0]:
				var horn_m := add_prop_mesh(dez_viking_charm_node, prop_cylinder(0.008, 0.022, 0.085), Vector3(float(h_side) * 0.058, 0.024, 0.0), mural_material(Color("fff0cc")), "MiniVikingHorn")
				horn_m.rotation_degrees = Vector3(0.0, 0.0, float(-h_side) * 38.0)
			prop.add_child(dez_viking_charm_node)
			surprise_keepsake_nodes["viking_dirt_biker"] = dez_viking_charm_node
			dez_carpet_keepsake_node = Node3D.new()
			dez_carpet_keepsake_node.name = "ZafiraSpiceCarpet"
			dez_carpet_keepsake_node.position = Vector3(-0.42, 0.14, 0.22)
			dez_carpet_keepsake_node.visible = false
			add_prop_mesh(dez_carpet_keepsake_node, prop_box(Vector3(0.34, 0.025, 0.24)), Vector3.ZERO, mural_material(Color("c42b4b")), "MiniCarpetWeave")
			add_prop_mesh(dez_carpet_keepsake_node, prop_box(Vector3(0.26, 0.030, 0.16)), Vector3(0.0, 0.004, 0.0), mural_material(Color("ffd45e")), "MiniCarpetMedallion")
			add_prop_mesh(dez_carpet_keepsake_node, prop_cylinder(0.068, 0.038, 0.048), Vector3(0.0, 0.038, 0.0), material(Color("b87344")), "MiniSpiceWok")
			prop.add_child(dez_carpet_keepsake_node)
			surprise_keepsake_nodes["magic_carpet_chef"] = dez_carpet_keepsake_node
		"thanh":
			# Cedar tea & folding-stool supply crate beside Thanh
			var crate := MeshInstance3D.new()
			var crate_box := BoxMesh.new()
			crate_box.size = Vector3(0.42, 0.34, 0.32)
			crate.mesh = crate_box
			crate.position = Vector3(0.46, 0.17, 0.14)
			crate.material_override = material(Color("a9784d"))
			prop.add_child(crate)
			var thermos := MeshInstance3D.new()
			var t_cyl := CylinderMesh.new()
			t_cyl.top_radius = 0.07
			t_cyl.bottom_radius = 0.07
			t_cyl.height = 0.22
			thermos.mesh = t_cyl
			thermos.position = Vector3(0.46, 0.45, 0.14)
			thermos.material_override = material(Color("6a8d73"))
			prop.add_child(thermos)
			thanh_starlight_fan_node = Node3D.new()
			thanh_starlight_fan_node.name = "StarlightRunwayCrown"
			thanh_starlight_fan_node.position = Vector3(0.33, 0.36, 0.16)
			thanh_starlight_fan_node.visible = false
			for f_i in range(-2, 3):
				var blade := add_prop_mesh(thanh_starlight_fan_node, prop_box(Vector3(0.028, 0.14, 0.014)), Vector3(float(f_i) * 0.022, 0.06, 0.0), mural_material(Color("f5a3d0") if posmod(f_i, 2) == 0 else Color("5fd4ba")), "FanPleat_%d" % (f_i + 2))
				blade.rotation_degrees = Vector3(-12.0, 0.0, float(-f_i) * 16.0)
			add_prop_mesh(thanh_starlight_fan_node, prop_cylinder(0.048, 0.042, 0.036), Vector3(0.0, 0.018, 0.05), mural_material(Color("ffd45e")), "StarlightMiniTiara")
			prop.add_child(thanh_starlight_fan_node)
			surprise_keepsake_nodes["impromptu_drag_show"] = thanh_starlight_fan_node
			thanh_nacho_bag_node = Node3D.new()
			thanh_nacho_bag_node.name = "RicoMiniNachoBag"
			thanh_nacho_bag_node.position = Vector3(0.57, 0.38, 0.14)
			thanh_nacho_bag_node.visible = false
			add_prop_mesh(thanh_nacho_bag_node, prop_box(Vector3(0.11, 0.13, 0.07)), Vector3(0.0, 0.025, -0.02), mural_material(Color("ffb84d")), "MiniNachoBag")
			var chip_m := add_prop_mesh(thanh_nacho_bag_node, prop_prism(Vector3(0.065, 0.055, 0.018)), Vector3(0.0, 0.10, -0.02), mural_material(Color("ffe07d")), "MiniTortillaChip")
			chip_m.rotation_degrees = Vector3(0.0, 18.0, 12.0)
			add_prop_mesh(thanh_nacho_bag_node, prop_cylinder(0.036, 0.028, 0.045), Vector3(0.055, -0.015, 0.045), mural_material(Color("5fd475")), "MiniSalsaVerdeCup")
			prop.add_child(thanh_nacho_bag_node)
			surprise_keepsake_nodes["bite_size_nachos"] = thanh_nacho_bag_node
	n_node.add_child(prop)

func build_neighbors_and_player() -> void:
	route_mesh = MeshInstance3D.new()
	route_mesh.name = "RouteRibbon"
	route_mesh.material_override = mural_material(Color("f5d57a"))
	add_child(route_mesh)
	for i in range(neighbors.size()):
		var n: Dictionary = neighbors[i]
		var n_id := String(n.get("id", ""))
		if n_id == CELESTE_ID:
			celeste_index = i
		elif n_id == ROOK_ID:
			rook_index = i
		var n_node := make_person_node(n.name, n.coat, n.skin, n.hair, 1.70, false)
		add_character_grounding(n_node, n.coat, false)
		n_node.position = n.pos
		n_node.scale = Vector3.ONE * CHARACTER_VISUAL_SCALE
		attach_neighbor_signature_prop(n_node, n_id)
		var nameplate := make_label_3d("Nameplate", String(n.name), Vector3(0.0, 2.10, 0.0), Color("fff6df"), 0.0068, 26)
		nameplate.set_meta("neighbor_index", i)
		nameplate.set_meta("neighbor_id", n_id)
		n_node.add_child(nameplate)
		add_child(n_node)
		neighbor_nodes.append(n_node)
	player = CharacterBody3D.new()
	player.name = "Player"
	player.position = PLAYER_START
	var col := CollisionShape3D.new()
	var shape := CylinderShape3D.new()
	shape.radius = PLAYER_RADIUS_M
	shape.height = PLAYER_HEIGHT_M
	col.shape = shape
	col.position = Vector3(0.0, PLAYER_HEIGHT_M * 0.5, 0.0)
	player.add_child(col)
	player_visual = make_person_node("PlayerVisual", Color("176b78"), Color("b67f5d"), Color("34392f"), PLAYER_HEIGHT_M, true)
	add_character_grounding(player_visual, Color("ffe866"), true)
	player_visual.scale = Vector3.ONE * CHARACTER_VISUAL_SCALE
	# A screen-sized caption below the feet stays clear of nearby speech prompts.
	player_nameplate = make_label_3d("PlayerNameplate", "YOU", Vector3(0.0, -0.55, 0.0), Color("ffe866"), 0.0070, 24)
	player_nameplate.outline_size = 10
	player_visual.add_child(player_nameplate)
	player.add_child(player_visual)
	add_child(player)

func mural_material(color: Color) -> StandardMaterial3D:
	var result := material(color)
	result.emission_enabled = true
	result.emission = color
	result.emission_energy_multiplier = 0.35
	return result

func build_mural_board() -> void:
	mural_node = Node3D.new()
	mural_node.name = "MuralBoard"
	mural_node.position = MURAL_POS
	var street_t := mural_tangent()
	mural_node.rotation.y = atan2(-street_t.y, street_t.x)
	var board_body := StaticBody3D.new()
	board_body.name = "StaticBody3D"
	var board_col := CollisionShape3D.new()
	var board_shape := BoxShape3D.new()
	board_shape.size = Vector3(3.56, 2.66, 0.36)
	board_col.shape = board_shape
	board_col.position = Vector3(0.0, 1.33, 0.0)
	board_body.add_child(board_col)
	mural_node.add_child(board_body)
	var base_ring := MeshInstance3D.new()
	var ring_mesh := CylinderMesh.new()
	ring_mesh.top_radius = 0.85
	ring_mesh.bottom_radius = 0.85
	ring_mesh.height = 0.04
	base_ring.mesh = ring_mesh
	base_ring.position = Vector3(0.0, 0.02, 0.0)
	base_ring.material_override = material(Color("e6d7b8"))
	mural_node.add_child(base_ring)
	for leg_x in [-1.45, 1.45]:
		var leg := MeshInstance3D.new()
		var leg_mesh := BoxMesh.new()
		leg_mesh.size = Vector3(0.16, 2.55, 0.18)
		leg.mesh = leg_mesh
		leg.position = Vector3(leg_x, 1.275, -0.05)
		leg.material_override = material(Color("6d4f38"))
		mural_node.add_child(leg)
	var frame := MeshInstance3D.new()
	var frame_mesh := BoxMesh.new()
	frame_mesh.size = Vector3(3.56, 1.92, 0.14)
	frame.mesh = frame_mesh
	frame.position = Vector3(0.0, 1.56, -0.05)
	frame.material_override = material(Color("5a402d"))
	mural_node.add_child(frame)
	mural_canvas_mesh = MeshInstance3D.new()
	mural_canvas_mesh.name = "MuralCanvas"
	var canvas_box := BoxMesh.new()
	canvas_box.size = Vector3(3.28, 1.66, 0.08)
	mural_canvas_mesh.mesh = canvas_box
	mural_canvas_mesh.position = Vector3(0.0, 1.56, 0.04)
	mural_node.add_child(mural_canvas_mesh)
	mural_banner_mesh = MeshInstance3D.new()
	mural_banner_mesh.name = "MuralCompletionBanner"
	var banner_box := BoxMesh.new()
	banner_box.size = Vector3(3.48, 0.24, 0.18)
	mural_banner_mesh.mesh = banner_box
	mural_banner_mesh.position = Vector3(0.0, 2.66, 0.0)
	mural_banner_mesh.material_override = mural_material(Color("f5d57a"))
	mural_banner_mesh.visible = false
	mural_node.add_child(mural_banner_mesh)
	mural_motif_nodes.clear()
	var sun_node := Node3D.new()
	sun_node.name = "MotifSun"
	var sun_disc := MeshInstance3D.new()
	var disc_mesh := CylinderMesh.new()
	disc_mesh.top_radius = 0.22
	disc_mesh.bottom_radius = 0.22
	disc_mesh.height = 0.08
	sun_disc.mesh = disc_mesh
	sun_disc.rotation_degrees = Vector3(90.0, 0.0, 0.0)
	sun_disc.material_override = mural_material(Color("f8cc58"))
	sun_node.add_child(sun_disc)
	for ray_size in [Vector3(0.52, 0.10, 0.06), Vector3(0.10, 0.52, 0.06)]:
		var ray := MeshInstance3D.new()
		var ray_mesh := BoxMesh.new()
		ray_mesh.size = ray_size
		ray.mesh = ray_mesh
		ray.material_override = mural_material(Color("fff3b0"))
		sun_node.add_child(ray)
	sun_node.visible = false
	mural_node.add_child(sun_node)
	mural_motif_nodes["sun"] = sun_node
	var wave_node := Node3D.new()
	wave_node.name = "MotifWave"
	for w_idx in range(3):
		var bar := MeshInstance3D.new()
		var bar_mesh := BoxMesh.new()
		bar_mesh.size = Vector3(0.48, 0.10, 0.08)
		bar.mesh = bar_mesh
		bar.position = Vector3((float(w_idx) - 1.0) * 0.05, (float(w_idx) - 1.0) * 0.13, 0.0)
		bar.material_override = mural_material(Color("5fd4ba") if w_idx != 1 else Color("9ef5e5"))
		wave_node.add_child(bar)
	wave_node.visible = false
	mural_node.add_child(wave_node)
	mural_motif_nodes["wave"] = wave_node
	var rise_node := Node3D.new()
	rise_node.name = "MotifRise"
	for r_idx in range(3):
		var step_mesh_inst := MeshInstance3D.new()
		var step_box := BoxMesh.new()
		var sh := 0.18 + float(r_idx) * 0.11
		step_box.size = Vector3(0.13, sh, 0.08)
		step_mesh_inst.mesh = step_box
		step_mesh_inst.position = Vector3((float(r_idx) - 1.0) * 0.15, -0.20 + sh * 0.5, 0.0)
		step_mesh_inst.material_override = mural_material(Color("ee835c") if r_idx < 2 else Color("ffb585"))
		rise_node.add_child(step_mesh_inst)
	rise_node.visible = false
	mural_node.add_child(rise_node)
	mural_motif_nodes["rise"] = rise_node
	hidden_mural_sketch_node = Node3D.new()
	hidden_mural_sketch_node.name = "HiddenMuralSketchCard"
	hidden_mural_sketch_node.position = Vector3(1.52, 0.88, 0.09)
	hidden_mural_sketch_node.visible = false
	add_prop_mesh(hidden_mural_sketch_node, prop_box(Vector3(0.46, 0.56, 0.04)), Vector3.ZERO, material(Color("4a3228")), "SketchBacking")
	add_prop_mesh(hidden_mural_sketch_node, prop_box(Vector3(0.40, 0.48, 0.05)), Vector3(0.0, 0.0, 0.01), mural_material(Color("283e56")), "SketchCanvas")
	add_prop_mesh(hidden_mural_sketch_node, prop_sphere(0.08), Vector3(-0.08, 0.04, 0.04), mural_material(Color("f5d57a")), "SketchHoundMotif")
	add_prop_mesh(hidden_mural_sketch_node, prop_cylinder(0.025, 0.04, 0.18), Vector3(0.09, -0.02, 0.04), mural_material(Color("5fd4ba")), "SketchSaxMotif")
	mural_node.add_child(hidden_mural_sketch_node)
	surprise_keepsake_nodes["hidden_mural_145"] = hidden_mural_sketch_node
	celeste_dino_figurine_node = Node3D.new()
	celeste_dino_figurine_node.name = "PipDinoMascot"
	celeste_dino_figurine_node.position = Vector3(-1.52, 0.88, 0.09)
	celeste_dino_figurine_node.visible = false
	add_prop_mesh(celeste_dino_figurine_node, prop_box(Vector3(0.28, 0.04, 0.22)), Vector3(0.0, -0.08, 0.02), material(Color("6a4f3b")), "DinoEaselLedge")
	add_prop_mesh(celeste_dino_figurine_node, prop_sphere(0.095), Vector3(0.0, 0.02, 0.03), mural_material(Color("7ce8b0")), "PipMiniBody")
	add_prop_mesh(celeste_dino_figurine_node, prop_sphere(0.072), Vector3(0.05, 0.11, 0.06), mural_material(Color("7ce8b0")), "PipMiniHead")
	add_prop_mesh(celeste_dino_figurine_node, prop_prism(Vector3(0.045, 0.055, 0.03)), Vector3(-0.02, 0.15, 0.02), mural_material(Color("ff8fa3")), "PipMiniCrest")
	celeste_dino_tail_node = add_prop_mesh(celeste_dino_figurine_node, prop_cylinder(0.018, 0.042, 0.12), Vector3(-0.09, 0.0, -0.02), mural_material(Color("7ce8b0")), "PipMiniTail")
	celeste_dino_tail_node.rotation_degrees = Vector3(58.0, -35.0, 0.0)
	mural_node.add_child(celeste_dino_figurine_node)
	surprise_keepsake_nodes["cutesy_dino"] = celeste_dino_figurine_node
	mural_node.add_child(make_label_3d("MuralBoardLabel", "Portable Mural (M)", Vector3(0.0, 3.25, 0.0), Color("ffe394"), 0.012, 22))
	add_child(mural_node)
	update_mural_3d()

func build_rook_speaker() -> void:
	speaker_node = Node3D.new()
	speaker_node.name = "RookSpeaker"
	speaker_node.position = ROOK_SPEAKER_POS
	var street_t := speaker_tangent()
	speaker_node.rotation.y = atan2(-street_t.y, street_t.x)
	var spk_body := StaticBody3D.new()
	spk_body.name = "StaticBody3D"
	var spk_col := CollisionShape3D.new()
	var spk_shape := BoxShape3D.new()
	spk_shape.size = Vector3(SPEAKER_HALF_EXTENTS.x * 2.0, 1.38, SPEAKER_HALF_EXTENTS.y * 2.0)
	spk_col.shape = spk_shape
	spk_col.position = Vector3(0.0, 0.69, 0.0)
	spk_body.add_child(spk_col)
	speaker_node.add_child(spk_body)
	var base_ring := MeshInstance3D.new()
	var ring_mesh := CylinderMesh.new()
	ring_mesh.top_radius = 0.50
	ring_mesh.bottom_radius = 0.50
	ring_mesh.height = 0.04
	base_ring.mesh = ring_mesh
	base_ring.position = Vector3(0.0, 0.02, 0.0)
	base_ring.material_override = material(Color("e6d7b8"))
	speaker_node.add_child(base_ring)
	var cabinet := MeshInstance3D.new()
	cabinet.name = "SpeakerCabinet"
	var cab_mesh := BoxMesh.new()
	cab_mesh.size = Vector3(SPEAKER_HALF_EXTENTS.x * 2.0, 1.18, SPEAKER_HALF_EXTENTS.y * 2.0)
	cabinet.mesh = cab_mesh
	cabinet.position = Vector3(0.0, 0.61, 0.0)
	cabinet.material_override = material(Color("3a322c"))
	speaker_node.add_child(cabinet)
	speaker_cone_mesh = MeshInstance3D.new()
	speaker_cone_mesh.name = "SpeakerCone"
	var cone_cyl := CylinderMesh.new()
	cone_cyl.top_radius = 0.21
	cone_cyl.bottom_radius = 0.21
	cone_cyl.height = 0.06
	speaker_cone_mesh.mesh = cone_cyl
	speaker_cone_mesh.rotation_degrees = Vector3(90.0, 0.0, 0.0)
	speaker_cone_mesh.position = Vector3(0.0, 0.72, 0.29)
	speaker_node.add_child(speaker_cone_mesh)
	speaker_beacon_mesh = MeshInstance3D.new()
	speaker_beacon_mesh.name = "SpeakerBeacon"
	var beacon_box := BoxMesh.new()
	beacon_box.size = Vector3(0.56, 0.16, 0.22)
	speaker_beacon_mesh.mesh = beacon_box
	speaker_beacon_mesh.position = Vector3(0.0, 1.30, 0.0)
	speaker_node.add_child(speaker_beacon_mesh)
	jeffrey_turntable_node = Node3D.new()
	jeffrey_turntable_node.name = "JeffreyRecordTurntable"
	jeffrey_turntable_node.position = Vector3(0.0, 1.20, 0.08)
	jeffrey_turntable_node.visible = false
	add_prop_mesh(jeffrey_turntable_node, prop_box(Vector3(0.42, 0.05, 0.32)), Vector3(0.0, 0.025, 0.0), material(Color("5c3d28")), "TurntablePlinth")
	jeffrey_turntable_disc_mesh = add_prop_mesh(jeffrey_turntable_node, prop_cylinder(0.13, 0.13, 0.02), Vector3(-0.04, 0.06, 0.02), material(Color("16181c")), "SpinningVinylLP")
	add_prop_mesh(jeffrey_turntable_disc_mesh, prop_cylinder(0.048, 0.048, 0.024), Vector3.ZERO, mural_material(Color("f8cc58")), "VinylCenterLabel")
	var tonearm := add_prop_mesh(jeffrey_turntable_node, prop_cylinder(0.012, 0.012, 0.16), Vector3(0.11, 0.07, 0.0), mural_material(Color("ffe394")), "TurntableTonearm")
	tonearm.rotation_degrees = Vector3(90.0, -24.0, 0.0)
	var mini_sleeve := add_prop_mesh(jeffrey_turntable_node, prop_box(Vector3(0.24, 0.24, 0.024)), Vector3(0.0, 0.16, -0.13), mural_material(Color("225588")), "ProppedRecordSleeve")
	mini_sleeve.rotation_degrees = Vector3(-14.0, 0.0, 0.0)
	speaker_node.add_child(jeffrey_turntable_node)
	surprise_keepsake_nodes["jeffrey_record"] = jeffrey_turntable_node
	rook_clown_horn_node = Node3D.new()
	rook_clown_horn_node.name = "BarnabyClownHornClip"
	rook_clown_horn_node.position = Vector3(0.42, 0.90, 0.08)
	rook_clown_horn_node.visible = false
	var horn_cone := add_prop_mesh(rook_clown_horn_node, prop_cylinder(0.052, 0.018, 0.22), Vector3(0.04, 0.0, 0.04), mural_material(Color("ffd45e")), "MiniBrassHornCone")
	horn_cone.rotation_degrees = Vector3(68.0, 22.0, -18.0)
	rook_clown_horn_bulb_mesh = add_prop_mesh(rook_clown_horn_node, prop_sphere(0.052), Vector3(-0.02, -0.04, -0.04), mural_material(Color("ff5252")), "MiniRedHornBulb")
	speaker_node.add_child(rook_clown_horn_node)
	surprise_keepsake_nodes["clown_horn_walker"] = rook_clown_horn_node
	speaker_node.add_child(make_label_3d("RookSpeakerLabel", "Rook's Speaker (R / K)", Vector3(0.0, 2.25, 0.0), Color("9ef5e5"), 0.012, 22))
	add_child(speaker_node)
	update_speaker_3d()

func update_speaker_3d() -> void:
	if speaker_cone_mesh != null:
		if music_playing:
			speaker_cone_mesh.material_override = mural_material(Color("f5d57a") if music_mode == "sketch" else Color("5fd4ba"))
		elif rook_soundcheck_done:
			speaker_cone_mesh.material_override = mural_material(Color("d6a85a"))
		else:
			speaker_cone_mesh.material_override = material(Color("7d7264"))
	if speaker_beacon_mesh != null:
		speaker_beacon_mesh.visible = music_playing or rook_soundcheck_done
		if music_playing:
			speaker_beacon_mesh.material_override = mural_material(Color("5fd4ba") if music_mode == "local" else Color("f8cc58"))
		else:
			speaker_beacon_mesh.material_override = mural_material(Color("e8b95a"))

func programme_segment_color(segment_id: String, hosted: bool) -> Color:
	match segment_id:
		"stories":
			return Color("f8cc58") if hosted else Color("e5b66d")
		"beats":
			return Color("b8e6ee") if hosted else Color("91bac2")
		"art":
			return Color("f1bed0") if hosted else Color("d9a2b2")
		_:
			return Color("c6deb0") if hosted else Color("a3b48c")

func hosting_tile_color(palette_id: String, tile_val: int) -> Color:
	var idx := clampi(tile_val, 0, 2)
	match palette_id:
		"cool":
			var cool_cols: Array[Color] = [Color("91bac2"), Color("a3b48c"), Color("987b9e")]
			return cool_cols[idx]
		_:
			var warm_cols: Array[Color] = [Color("e5b66d"), Color("d9a2b2"), Color("75907c")]
			return warm_cols[idx]

func build_block_banner() -> void:
	block_banner_node = Node3D.new()
	block_banner_node.name = "BlockGatheringBanner"
	var banner_pos: Vector3 = neighbors[0].pos + BLOCK_BANNER_OFFSET
	block_banner_node.position = banner_pos
	var st := nearest_street_tangent(Vector2(banner_pos.x, banner_pos.z))
	var street_t := -st if st.x < 0.0 else st
	var banner_rot_y := atan2(-street_t.y, street_t.x)
	block_banner_node.rotation.y = banner_rot_y
	var arch_beam := MeshInstance3D.new()
	arch_beam.name = "ArchBeam"
	var beam_box := BoxMesh.new()
	beam_box.size = Vector3(2.80, 0.24, 0.18)
	arch_beam.mesh = beam_box
	arch_beam.position = Vector3(0.0, 2.55, 0.0)
	arch_beam.material_override = mural_material(Color("f5d57a"))
	block_banner_node.add_child(arch_beam)
	var lantern_colors: Array[Color] = [Color("ee835c"), Color("5fd4ba"), Color("f8cc58")]
	for i in range(3):
		var lantern := MeshInstance3D.new()
		lantern.name = "GatheringLantern%d" % i
		var cyl := CylinderMesh.new()
		cyl.top_radius = 0.16
		cyl.bottom_radius = 0.16
		cyl.height = 0.24
		lantern.mesh = cyl
		lantern.position = Vector3((float(i) - 1.0) * 0.95, 2.28, 0.0)
		lantern.material_override = mural_material(lantern_colors[i])
		block_banner_node.add_child(lantern)
	block_banner_node.visible = false
	add_child(block_banner_node)

	keepsake_frame_node = Node3D.new()
	keepsake_frame_node.name = "KeepsakePhotoEasel"
	keepsake_frame_node.position = neighbors[0].pos + Vector3(1.85, 0.0, -0.45)
	keepsake_frame_node.rotation.y = banner_rot_y
	var k_frame := MeshInstance3D.new()
	var k_frame_box := BoxMesh.new()
	k_frame_box.size = Vector3(1.10, 0.86, 0.10)
	k_frame.mesh = k_frame_box
	k_frame.position = Vector3(0.0, 1.18, 0.0)
	k_frame.material_override = material(Color("5a402d"))
	keepsake_frame_node.add_child(k_frame)
	keepsake_canvas_mesh = MeshInstance3D.new()
	keepsake_canvas_mesh.name = "KeepsakePhotoCanvas"
	var k_canvas_box := BoxMesh.new()
	k_canvas_box.size = Vector3(0.94, 0.70, 0.12)
	keepsake_canvas_mesh.mesh = k_canvas_box
	keepsake_canvas_mesh.position = Vector3(0.0, 1.18, 0.02)
	keepsake_canvas_mesh.material_override = mural_material(mural_palette_color("garden", true))
	keepsake_frame_node.add_child(keepsake_canvas_mesh)
	keepsake_guest_pips.clear()
	for g_idx in range(PHOTO_GUESTS.size()):
		var g_id := PHOTO_GUESTS[g_idx]
		var pip := MeshInstance3D.new()
		pip.name = "KeepsakeGuestPip_%s" % g_id
		var pip_cyl := CylinderMesh.new()
		pip_cyl.top_radius = 0.07
		pip_cyl.bottom_radius = 0.07
		pip_cyl.height = 0.14
		pip.mesh = pip_cyl
		pip.rotation_degrees = Vector3(90.0, 0.0, 0.0)
		pip.position = Vector3(-0.30 + float(g_idx) * 0.20, 0.96, 0.05)
		pip.material_override = mural_material(Color("f8cc58"))
		keepsake_frame_node.add_child(pip)
		keepsake_guest_pips[g_id] = pip
	keepsake_frame_node.visible = false
	add_child(keepsake_frame_node)

	loan_return_beacons.clear()
	var loan_positions: Dictionary = {
		"table": neighbors[4].pos + Vector3(0.95, 0.32, 0.0),
		"paint-case": neighbors[1].pos + Vector3(-0.95, 0.32, 0.0),
		"speaker": ROOK_SPEAKER_POS + Vector3(0.62, 0.32, 0.0)
	}
	for lid in LOAN_IDS:
		var l_beacon := MeshInstance3D.new()
		l_beacon.name = "LoanBeacon_%s" % lid
		var l_box := BoxMesh.new()
		l_box.size = Vector3(0.38, 0.32, 0.30)
		l_beacon.mesh = l_box
		l_beacon.position = loan_positions[lid]
		l_beacon.material_override = material(Color("8a7964"))
		l_beacon.visible = false
		add_child(l_beacon)
		loan_return_beacons[lid] = l_beacon

	programme_board_node = Node3D.new()
	programme_board_node.name = "ProgrammeSignboard"
	programme_board_node.position = neighbors[0].pos + Vector3(-1.85, 0.0, -0.45)
	programme_board_node.rotation.y = banner_rot_y
	var p_board := MeshInstance3D.new()
	var p_box := BoxMesh.new()
	p_box.size = Vector3(1.06, 1.32, 0.10)
	p_board.mesh = p_box
	p_board.position = Vector3(0.0, 1.24, 0.0)
	p_board.material_override = material(Color("4a3d33"))
	programme_board_node.add_child(p_board)
	programme_segment_bars.clear()
	for s_idx in range(PROGRAMME_SEGMENTS.size()):
		var s_bar := MeshInstance3D.new()
		s_bar.name = "ProgrammeSegmentBar%d" % s_idx
		var s_bar_box := BoxMesh.new()
		s_bar_box.size = Vector3(0.88, 0.18, 0.12)
		s_bar.mesh = s_bar_box
		s_bar.position = Vector3(0.0, 1.62 - float(s_idx) * 0.25, 0.02)
		s_bar.material_override = mural_material(programme_segment_color(PROGRAMME_DEFAULT_ORDER[s_idx], false))
		programme_board_node.add_child(s_bar)
		programme_segment_bars.append(s_bar)
	programme_board_node.visible = false
	add_child(programme_board_node)

	hosting_tile_panel_node = Node3D.new()
	hosting_tile_panel_node.name = "HostingArtTilePanel"
	hosting_tile_panel_node.position = MURAL_POS + Vector3(2.35, 0.0, 0.0)
	var m_t := mural_tangent()
	hosting_tile_panel_node.rotation.y = atan2(-m_t.y, m_t.x)
	var h_frame := MeshInstance3D.new()
	var h_frame_box := BoxMesh.new()
	h_frame_box.size = Vector3(1.24, 0.92, 0.10)
	h_frame.mesh = h_frame_box
	h_frame.position = Vector3(0.0, 1.32, 0.0)
	h_frame.material_override = material(Color("5a402d"))
	hosting_tile_panel_node.add_child(h_frame)
	hosting_tile_meshes.clear()
	for t_idx in range(6):
		var t_mesh := MeshInstance3D.new()
		t_mesh.name = "HostingTile%d" % t_idx
		var t_box := BoxMesh.new()
		t_box.size = Vector3(0.30, 0.30, 0.12)
		t_mesh.mesh = t_box
		var tc := t_idx % 3
		var tr := int(t_idx / 3)
		t_mesh.position = Vector3(-0.36 + float(tc) * 0.36, 1.50 - float(tr) * 0.36, 0.02)
		t_mesh.material_override = mural_material(hosting_tile_color("warm", HOSTING_DEFAULT_TILES[t_idx]))
		hosting_tile_panel_node.add_child(t_mesh)
		hosting_tile_meshes.append(t_mesh)
	hosting_tile_panel_node.visible = false
	add_child(hosting_tile_panel_node)

	civic_setup_node = Node3D.new()
	civic_setup_node.name = "CivicListeningSetup"
	civic_setup_node.position = neighbors[0].pos + Vector3(3.40, 0.0, -0.45)
	civic_setup_node.rotation.y = banner_rot_y
	civic_circle_group = Node3D.new()
	civic_circle_group.name = "CivicCircleGroup"
	var circle_offsets: Array[Vector3] = [
		Vector3(-0.48, 0.24, -0.28),
		Vector3(0.48, 0.24, -0.28),
		Vector3(-0.48, 0.24, 0.28),
		Vector3(0.48, 0.24, 0.28)
	]
	for c_i in range(circle_offsets.size()):
		var c_stool := MeshInstance3D.new()
		c_stool.name = "CivicCircleStool%d" % c_i
		var c_cyl := CylinderMesh.new()
		c_cyl.top_radius = 0.20
		c_cyl.bottom_radius = 0.18
		c_cyl.height = 0.48
		c_stool.mesh = c_cyl
		c_stool.position = circle_offsets[c_i]
		c_stool.material_override = material(Color("75907c"))
		civic_circle_group.add_child(c_stool)
	var c_board := MeshInstance3D.new()
	var c_board_box := BoxMesh.new()
	c_board_box.size = Vector3(0.68, 0.52, 0.08)
	c_board.mesh = c_board_box
	c_board.position = Vector3(0.0, 0.92, -0.42)
	c_board.material_override = material(Color("d9a2b2"))
	civic_circle_group.add_child(c_board)
	civic_setup_node.add_child(civic_circle_group)

	civic_dropin_group = Node3D.new()
	civic_dropin_group.name = "CivicDropinGroup"
	var d_table := MeshInstance3D.new()
	var d_table_box := BoxMesh.new()
	d_table_box.size = Vector3(1.24, 0.72, 0.42)
	d_table.mesh = d_table_box
	d_table.position = Vector3(0.0, 0.36, -0.18)
	d_table.material_override = material(Color("d9a2b2"))
	civic_dropin_group.add_child(d_table)
	for d_i in range(2):
		var d_stool := MeshInstance3D.new()
		d_stool.name = "CivicDropinStool%d" % d_i
		var d_cyl := CylinderMesh.new()
		d_cyl.top_radius = 0.20
		d_cyl.bottom_radius = 0.18
		d_cyl.height = 0.48
		d_stool.mesh = d_cyl
		d_stool.position = Vector3(-0.34 + float(d_i) * 0.68, 0.24, 0.32)
		d_stool.material_override = material(Color("75907c"))
		civic_dropin_group.add_child(d_stool)
	civic_setup_node.add_child(civic_dropin_group)

	civic_done_beacon = MeshInstance3D.new()
	civic_done_beacon.name = "CivicDoneBeacon"
	var cb_sphere := SphereMesh.new()
	cb_sphere.radius = 0.16
	cb_sphere.height = 0.32
	civic_done_beacon.mesh = cb_sphere
	civic_done_beacon.position = Vector3(0.0, 1.38, -0.42)
	civic_done_beacon.material_override = material(Color("8a7964"))
	civic_setup_node.add_child(civic_done_beacon)
	civic_setup_node.visible = false
	add_child(civic_setup_node)

	film_storyboard_node = Node3D.new()
	film_storyboard_node.name = "FilmStoryboardEasel"
	film_storyboard_node.position = MURAL_POS + Vector3(-2.35, 0.0, 0.0)
	film_storyboard_node.rotation.y = atan2(-m_t.y, m_t.x)
	var f_frame := MeshInstance3D.new()
	var f_frame_box := BoxMesh.new()
	f_frame_box.size = Vector3(1.16, 0.88, 0.10)
	f_frame.mesh = f_frame_box
	f_frame.position = Vector3(0.0, 1.28, 0.0)
	f_frame.material_override = material(Color("253f35"))
	film_storyboard_node.add_child(f_frame)
	film_frame_canvas = MeshInstance3D.new()
	film_frame_canvas.name = "FilmFrameCanvas"
	var f_canvas_box := BoxMesh.new()
	f_canvas_box.size = Vector3(0.96, 0.62, 0.12)
	film_frame_canvas.mesh = f_canvas_box
	film_frame_canvas.position = Vector3(0.0, 1.32, 0.02)
	film_frame_canvas.material_override = mural_material(Color("276a5a"))
	film_storyboard_node.add_child(film_frame_canvas)
	film_wide_border = MeshInstance3D.new()
	film_wide_border.name = "FilmWideBorder"
	var f_wide_box := BoxMesh.new()
	f_wide_box.size = Vector3(0.92, 0.10, 0.14)
	film_wide_border.mesh = f_wide_box
	film_wide_border.position = Vector3(0.0, 1.06, 0.03)
	film_wide_border.material_override = mural_material(Color("c38c65"))
	film_wide_border.visible = false
	film_storyboard_node.add_child(film_wide_border)
	film_shot_pips.clear()
	for s_i in range(FILM_SHOTS.size()):
		var f_pip := MeshInstance3D.new()
		f_pip.name = "FilmShotPip%d" % s_i
		var f_pip_cyl := CylinderMesh.new()
		f_pip_cyl.top_radius = 0.07
		f_pip_cyl.bottom_radius = 0.07
		f_pip_cyl.height = 0.14
		f_pip.mesh = f_pip_cyl
		f_pip.rotation_degrees = Vector3(90.0, 0.0, 0.0)
		f_pip.position = Vector3(-0.28 + float(s_i) * 0.28, 0.92, 0.04)
		f_pip.material_override = material(Color("5a665f"))
		film_storyboard_node.add_child(f_pip)
		film_shot_pips.append(f_pip)
	film_storyboard_node.visible = false
	add_child(film_storyboard_node)
	update_block_3d()

func film_shot_color(shot_id: String) -> Color:
	match shot_id:
		"paint":
			return Color("d9a2b2")
		"welcome":
			return Color("91bac2")
		_:
			return Color("276a5a")

func update_block_3d() -> void:
	update_layout_3d()
	if block_banner_node != null:
		block_banner_node.visible = block_opened
	if keepsake_frame_node != null:
		var photo_taken := block_opened and String(keepsake_photo.get("status", "unasked")) == "taken"
		keepsake_frame_node.visible = photo_taken
		if photo_taken and keepsake_canvas_mesh != null:
			var k_pal := String(keepsake_photo.get("palette", "garden"))
			keepsake_canvas_mesh.material_override = mural_material(mural_palette_color(k_pal, true))
			var parts: Array = keepsake_photo.get("participants", [])
			for g_id in PHOTO_GUESTS:
				if keepsake_guest_pips.has(g_id):
					var pip_mesh: MeshInstance3D = keepsake_guest_pips[g_id]
					pip_mesh.visible = parts.has(g_id)
	for lid in LOAN_IDS:
		if loan_return_beacons.has(lid):
			var l_beacon: MeshInstance3D = loan_return_beacons[lid]
			var returned := epilogue_returned.has(lid)
			l_beacon.visible = block_opened and (epilogue_packing or returned)
			l_beacon.material_override = mural_material(Color("f8cc58")) if returned else material(Color("8a7964"))
	if programme_board_node != null:
		var board_order: Array[String] = hosting_order if not hosting_order.is_empty() else programme_published
		var pub_ready := block_opened and board_order.size() == PROGRAMME_SEGMENTS.size()
		programme_board_node.visible = pub_ready
		if pub_ready:
			for s_idx in range(mini(programme_segment_bars.size(), board_order.size())):
				var seg_id := board_order[s_idx]
				var hosted := has_hosted_segment(seg_id)
				programme_segment_bars[s_idx].material_override = mural_material(programme_segment_color(seg_id, hosted))
	if hosting_tile_panel_node != null:
		var art_val: Variant = get_hosted_segment_value("art")
		var art_done := block_opened and (art_val is Dictionary)
		hosting_tile_panel_node.visible = art_done
		if art_done:
			var art_dict: Dictionary = art_val
			var h_pal := String(art_dict.get("palette", "warm"))
			var h_tiles: Array = art_dict.get("tiles", HOSTING_DEFAULT_TILES)
			for t_idx in range(hosting_tile_meshes.size()):
				var tv := int(h_tiles[t_idx]) if t_idx < h_tiles.size() else 0
				hosting_tile_meshes[t_idx].material_override = mural_material(hosting_tile_color(h_pal, tv))
	if civic_setup_node != null:
		var c_vis := is_civic_available() and (civic_phase in ["meeting", "done"]) and not civic_result.is_empty()
		civic_setup_node.visible = c_vis
		if c_vis:
			var c_fmt := String(civic_result.get("format", "circle"))
			if civic_circle_group != null:
				civic_circle_group.visible = (c_fmt == "circle")
			if civic_dropin_group != null:
				civic_dropin_group.visible = (c_fmt == "dropin")
			if civic_done_beacon != null:
				civic_done_beacon.material_override = mural_material(Color("f8cc58")) if civic_phase == "done" else material(Color("8a7964"))
	if film_storyboard_node != null:
		var f_vis := is_film_available() and (film_phase in ["hold", "shooting", "done"]) and not film_result.is_empty()
		film_storyboard_node.visible = f_vis
		if f_vis:
			var f_framing := String(film_result.get("framing", "close"))
			if film_wide_border != null:
				film_wide_border.visible = (f_framing == "wide")
			var f_ord: Array = film_result.get("order", FILM_SHOTS)
			var active_shot := "seat"
			if f_ord.size() == 3:
				if film_phase == "done":
					active_shot = String(f_ord[clampi(film_screen_frame, 0, 2)])
				elif film_phase == "shooting" and film_captured.size() < 3:
					active_shot = String(f_ord[film_captured.size()])
				else:
					active_shot = String(f_ord[0])
			if film_frame_canvas != null:
				film_frame_canvas.material_override = mural_material(film_shot_color(active_shot))
			for p_i in range(film_shot_pips.size()):
				var is_cap := p_i < film_captured.size()
				film_shot_pips[p_i].material_override = mural_material(Color("f8cc58")) if is_cap else material(Color("5a665f"))

func build_audio_players() -> void:
	sketch_generator = AudioStreamGenerator.new()
	sketch_generator.mix_rate = MUSIC_MIX_RATE
	sketch_generator.buffer_length = 0.25
	sketch_player = AudioStreamPlayer.new()
	sketch_player.name = "SketchAudioPlayer"
	sketch_player.playback_type = AudioServer.PLAYBACK_TYPE_STREAM
	sketch_player.stream = sketch_generator
	add_child(sketch_player)
	local_audio_player = AudioStreamPlayer.new()
	local_audio_player.name = "LocalAudioPlayer"
	local_audio_player.playback_type = AudioServer.PLAYBACK_TYPE_STREAM
	add_child(local_audio_player)
	reward_audio_player = AudioStreamPlayer.new()
	reward_audio_player.name = "RewardAudioPlayer"
	reward_audio_player.playback_type = AudioServer.PLAYBACK_TYPE_STREAM
	reward_audio_player.max_polyphony = 1
	add_child(reward_audio_player)
	apply_music_volume_db()
	recompute_music_stems()

## Original short bell notes with a soft attack/release; one bounded, non-looping stream.
func make_reward_sound() -> AudioStreamWAV:
	var rate := 22050
	var duration := clampf(cue_arpeggio_duration, 0.1, 0.75)
	var frames := int(ceil(duration * rate))
	var pcm := PackedByteArray()
	pcm.resize(frames * 2)
	var notes := maxi(1, cue_arpeggio_freqs.size())
	var note_duration := duration / notes
	for i in range(frames):
		var t := float(i) / rate
		var note := mini(int(t / note_duration), notes - 1)
		var local_t := t - note * note_duration
		var freq := cue_arpeggio_freqs[note] if not cue_arpeggio_freqs.is_empty() else 523.25
		var envelope := minf(local_t / 0.012, 1.0) * minf(maxf(0.0, note_duration - local_t) / 0.035, 1.0)
		var sample := (sin(TAU * freq * local_t) + 0.15 * sin(TAU * freq * 2.0 * local_t)) * envelope * 0.12
		pcm.encode_s16(i * 2, int(round(sample * 32767.0)))
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = rate
	stream.stereo = false
	stream.loop_mode = AudioStreamWAV.LOOP_DISABLED
	stream.data = pcm
	return stream

func play_reward_sound(cue_id: String) -> void:
	if not reward_sounds_enabled or not reward_audio_unlocked or suppress_feel_good_burst or reward_audio_player == null:
		return
	# Replace the previous note instead of stacking or queueing old rewards.
	reward_audio_player.stop()
	reward_audio_player.stream = make_reward_sound()
	reward_sound_count += 1
	reward_sound_last_cue = cue_id
	if AudioServer.get_driver_name() != "Dummy":
		reward_audio_player.play()

func set_reward_sounds_enabled(enabled: bool, persist := true) -> void:
	reward_sounds_enabled = enabled
	if not enabled and reward_audio_player != null:
		reward_audio_player.stop()
	if sounds_btn != null:
		sounds_btn.text = "Sounds: On" if enabled else "Sounds: Off"
		sounds_btn.set_pressed_no_signal(enabled)
	if persist:
		save_godot_settings()

func toggle_reward_sounds() -> void:
	set_reward_sounds_enabled(not reward_sounds_enabled)
	announce_a11y_status("Reward sounds %s. Music has its own controls." % ("on" if reward_sounds_enabled else "off"))

func mural_palette_color(palette_id: String, completed: bool) -> Color:
	match palette_id:
		"sunset":
			return Color("8c495e") if completed else Color("6c3949")
		"ocean":
			return Color("366f94") if completed else Color("295572")
		_:
			return Color("3f7a66") if completed else Color("316050")

func update_mural_3d() -> void:
	mural_completed = mural_placements.size() == MURAL_MOTIFS.size()
	if mural_canvas_mesh != null:
		mural_canvas_mesh.material_override = mural_material(mural_palette_color(mural_palette, mural_completed))
	for motif_id in MURAL_MOTIFS:
		if not mural_motif_nodes.has(motif_id):
			continue
		var m_node: Node3D = mural_motif_nodes[motif_id]
		if mural_placements.has(motif_id):
			var cell: Dictionary = mural_placements[motif_id]
			var c: int = int(cell.get("col", 0))
			var r: int = int(cell.get("row", 0))
			m_node.visible = true
			m_node.position = Vector3(-1.28 + float(c) * 0.51, 1.98 - float(r) * 0.43, 0.11)
		else:
			m_node.visible = false
	if mural_banner_mesh != null:
		mural_banner_mesh.visible = mural_completed
	update_block_3d()
	recompute_music_stems()
	update_block_ui()

func person_material(color: Color) -> StandardMaterial3D:
	var result := material(color)
	result.roughness = 0.65
	result.emission_enabled = true
	result.emission = color
	result.emission_energy_multiplier = 0.22
	return result

## Original presentation marks, not pavement markings or physical collision.
## Only the player and five ground-level neighbors use these; raised performers
## and the fictional flying chef keep their separate staging.
func character_ground_mesh(inner_radius: float, outer_radius: float, inner_color: Color, outer_color: Color) -> ArrayMesh:
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	for i in range(48):
		var a := Vector3(cos(float(i) * TAU / 48.0), 0.0, sin(float(i) * TAU / 48.0))
		var b := Vector3(cos(float(i + 1) * TAU / 48.0), 0.0, sin(float(i + 1) * TAU / 48.0))
		for vertex in [[a * inner_radius, inner_color], [b * outer_radius, outer_color], [a * outer_radius, outer_color], [a * inner_radius, inner_color], [b * inner_radius, inner_color], [b * outer_radius, outer_color]]:
			surface.set_color(vertex[1])
			surface.set_normal(Vector3.UP)
			surface.add_vertex(vertex[0])
	return surface.commit()

func add_character_grounding(person: Node3D, tint: Color, is_player: bool) -> void:
	var ring := person.get_node("GroundRing") as MeshInstance3D
	var radius := 0.65 if is_player else 0.60
	var ink := tint if is_player else tint.lightened(0.30)
	ring.mesh = character_ground_mesh(radius - (0.10 if is_player else 0.085), radius, ink, ink)
	ring.position.y = 0.040
	var marker_material := StandardMaterial3D.new()
	marker_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	marker_material.vertex_color_use_as_albedo = true
	marker_material.cull_mode = BaseMaterial3D.CULL_DISABLED
	ring.material_override = marker_material
	ring.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var contact := MeshInstance3D.new()
	contact.name = "ContactShadow"
	contact.mesh = character_ground_mesh(0.0, 0.48, Color(0.035, 0.045, 0.055, 0.46), Color(0.035, 0.045, 0.055, 0.0))
	contact.position.y = CHARACTER_SHADOW_GROUND_Y / CHARACTER_VISUAL_SCALE # Clears the route ribbon at world y0.06.
	var contact_material := marker_material.duplicate() as StandardMaterial3D
	contact_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	contact_material.render_priority = 1 # Composite over the map-wide additive evening pools consistently.
	contact.material_override = contact_material
	contact.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	person.add_child(contact)

func make_person_node(node_name: String, coat: Color, skin: Color, hair: Color, total_height: float, is_player: bool) -> Node3D:
	var root_node := Node3D.new()
	root_node.name = node_name
	root_node.set_meta("total_height", total_height)
	var ring := MeshInstance3D.new()
	ring.name = "GroundRing"
	var ring_mesh := CylinderMesh.new()
	ring_mesh.top_radius = 0.65 if is_player else 0.55
	ring_mesh.bottom_radius = ring_mesh.top_radius
	ring_mesh.height = 0.04
	ring.mesh = ring_mesh
	ring.position = Vector3(0.0, 0.02, 0.0)
	ring.material_override = mural_material(Color("ffe866") if is_player else coat.lightened(0.28))
	root_node.add_child(ring)
	var shoe_h := total_height * 0.06
	var leg_h := total_height * 0.36
	var legs_top := shoe_h + leg_h
	for leg_side in [-0.10, 0.10]:
		var is_left_leg: bool = leg_side < 0.0
		var shoe := MeshInstance3D.new()
		shoe.name = "LeftShoe" if is_left_leg else "RightShoe"
		var shoe_cyl := CylinderMesh.new()
		shoe_cyl.top_radius = 0.075
		shoe_cyl.bottom_radius = 0.085
		shoe_cyl.height = shoe_h
		shoe.mesh = shoe_cyl
		shoe.position = Vector3(leg_side, shoe_h * 0.5, 0.02)
		shoe.material_override = person_material(Color("e5e0c9") if is_player else Color("232c29"))
		root_node.add_child(shoe)
		var leg := MeshInstance3D.new()
		leg.name = "LeftLeg" if is_left_leg else "RightLeg"
		var leg_cyl := CylinderMesh.new()
		leg_cyl.top_radius = 0.082
		leg_cyl.bottom_radius = 0.068
		leg_cyl.height = leg_h
		leg.mesh = leg_cyl
		leg.position = Vector3(leg_side, shoe_h + leg_h * 0.5, 0.0)
		leg.material_override = person_material(Color("304248"))
		root_node.add_child(leg)
	# Tapered rounded jacket/coat torso
	var torso := MeshInstance3D.new()
	torso.name = "Torso"
	var torso_cyl := CylinderMesh.new()
	var torso_h := total_height * 0.36
	torso_cyl.top_radius = 0.21
	torso_cyl.bottom_radius = 0.175
	torso_cyl.height = torso_h
	torso.mesh = torso_cyl
	torso.position = Vector3(0.0, legs_top + torso_h * 0.5, 0.0)
	torso.material_override = person_material(coat)
	root_node.add_child(torso)
	# Rounded collar / scarf ring
	var collar := MeshInstance3D.new()
	collar.name = "Collar"
	var collar_cyl := CylinderMesh.new()
	var collar_h := total_height * 0.05
	collar_cyl.top_radius = 0.165
	collar_cyl.bottom_radius = 0.195
	collar_cyl.height = collar_h
	collar.mesh = collar_cyl
	collar.position = Vector3(0.0, legs_top + torso_h - collar_h * 0.4, 0.0)
	collar.material_override = person_material(Color("f2c760") if is_player else coat.lightened(0.24))
	root_node.add_child(collar)
	var arm_h := torso_h * 0.80
	var hand_r := 0.055
	for arm_side in [-0.24, 0.24]:
		var is_left_arm: bool = arm_side < 0.0
		var arm := MeshInstance3D.new()
		arm.name = "LeftArm" if is_left_arm else "RightArm"
		var arm_cyl := CylinderMesh.new()
		arm_cyl.top_radius = 0.062
		arm_cyl.bottom_radius = 0.052
		arm_cyl.height = arm_h
		arm.mesh = arm_cyl
		arm.position = Vector3(arm_side, legs_top + torso_h - arm_h * 0.5 - 0.03, 0.0)
		arm.rotation_degrees = Vector3(0.0, 0.0, 7.0 if is_left_arm else -7.0)
		arm.material_override = person_material(coat.darkened(0.06))
		root_node.add_child(arm)
		var hand := MeshInstance3D.new()
		hand.name = "LeftHand" if is_left_arm else "RightHand"
		var hand_sph := SphereMesh.new()
		hand_sph.radius = hand_r
		hand_sph.height = hand_r * 2.0
		hand.mesh = hand_sph
		hand.position = Vector3(arm_side * 1.06, legs_top + hand_r + 0.02, 0.02)
		hand.material_override = person_material(skin)
		root_node.add_child(hand)
	# Smooth rounded head (SphereMesh)
	var head := MeshInstance3D.new()
	head.name = "Head"
	var head_sph := SphereMesh.new()
	var head_h := total_height * 0.165
	head_sph.radius = head_h * 0.52
	head_sph.height = head_h
	head.mesh = head_sph
	var head_cy := legs_top + torso_h + head_h * 0.48
	head.position = Vector3(0.0, head_cy, 0.0)
	head.material_override = person_material(skin)
	root_node.add_child(head)
	# Expressive eyes on face inside a Node3D child so player_height_m() is unaffected
	var face_node := Node3D.new()
	face_node.name = "FaceFeatures"
	for eye_x in [-0.052, 0.052]:
		var eye := MeshInstance3D.new()
		var eye_sph := SphereMesh.new()
		eye_sph.radius = 0.022
		eye_sph.height = 0.044
		eye.mesh = eye_sph
		eye.position = Vector3(eye_x, head_cy + 0.015, head_h * 0.48)
		eye.material_override = person_material(Color("1a1e21"))
		face_node.add_child(eye)
	root_node.add_child(face_node)
	# Sculpted rounded hair dome / cap reaching exact total_height
	var cap := MeshInstance3D.new()
	cap.name = "HairCap"
	var cap_sph := SphereMesh.new()
	var cap_h := total_height - (legs_top + torso_h + head_h * 0.62)
	cap_sph.radius = head_h * 0.56
	cap_sph.height = cap_h
	cap.mesh = cap_sph
	cap.position = Vector3(0.0, total_height - cap_h * 0.5, -0.01)
	cap.material_override = person_material(hair)
	root_node.add_child(cap)
	return root_node

func animate_person_node(p_node: Node3D, phase: float, stride_amt: float, gesture_amt: float) -> void:
	if p_node == null:
		return
	var total_h: float = float(p_node.get_meta("total_height", 1.70))
	var shoe_h := total_h * 0.06
	var leg_h := total_h * 0.36
	var legs_top := shoe_h + leg_h
	var torso_h := total_h * 0.36
	var arm_h := torso_h * 0.80
	var hand_r := 0.055
	var shoulder_y := legs_top + torso_h - 0.03
	var leg_swing := sin(phase) * 0.44 * stride_amt
	var l_leg := p_node.get_node_or_null("LeftLeg") as MeshInstance3D
	var r_leg := p_node.get_node_or_null("RightLeg") as MeshInstance3D
	var l_shoe := p_node.get_node_or_null("LeftShoe") as MeshInstance3D
	var r_shoe := p_node.get_node_or_null("RightShoe") as MeshInstance3D
	if l_leg != null and l_shoe != null:
		l_leg.rotation.x = leg_swing
		l_leg.position = Vector3(-0.10, legs_top - cos(leg_swing) * (leg_h * 0.5), -sin(leg_swing) * (leg_h * 0.5))
		l_shoe.rotation.x = leg_swing
		l_shoe.position = Vector3(-0.10, legs_top - cos(leg_swing) * (leg_h + shoe_h * 0.5), -sin(leg_swing) * (leg_h + shoe_h * 0.5) + 0.02)
	if r_leg != null and r_shoe != null:
		var r_swing := -leg_swing
		r_leg.rotation.x = r_swing
		r_leg.position = Vector3(0.10, legs_top - cos(r_swing) * (leg_h * 0.5), -sin(r_swing) * (leg_h * 0.5))
		r_shoe.rotation.x = r_swing
		r_shoe.position = Vector3(0.10, legs_top - cos(r_swing) * (leg_h + shoe_h * 0.5), -sin(r_swing) * (leg_h + shoe_h * 0.5) + 0.02)
	var l_arm := p_node.get_node_or_null("LeftArm") as MeshInstance3D
	var r_arm := p_node.get_node_or_null("RightArm") as MeshInstance3D
	var l_hand := p_node.get_node_or_null("LeftHand") as MeshInstance3D
	var r_hand := p_node.get_node_or_null("RightHand") as MeshInstance3D
	var l_arm_ang := -sin(phase) * 0.38 * stride_amt + sin(phase * 0.5) * 0.08 * gesture_amt
	var r_arm_ang := sin(phase) * 0.38 * stride_amt - (0.34 + sin(phase * 1.4) * 0.22) * gesture_amt
	if l_arm != null and l_hand != null:
		l_arm.rotation = Vector3(l_arm_ang, 0.0, deg_to_rad(7.0))
		l_arm.position = Vector3(-0.24, shoulder_y - cos(l_arm_ang) * (arm_h * 0.5), -sin(l_arm_ang) * (arm_h * 0.5))
		l_hand.position = Vector3(-0.24 * 1.06, shoulder_y - cos(l_arm_ang) * (arm_h + hand_r * 0.35), -sin(l_arm_ang) * (arm_h + hand_r * 0.35) + 0.02)
	if r_arm != null and r_hand != null:
		r_arm.rotation = Vector3(r_arm_ang, 0.0, deg_to_rad(-7.0 - 12.0 * gesture_amt))
		r_arm.position = Vector3(0.24, shoulder_y - cos(r_arm_ang) * (arm_h * 0.5), -sin(r_arm_ang) * (arm_h * 0.5))
		r_hand.position = Vector3(0.24 * 1.06, shoulder_y - cos(r_arm_ang) * (arm_h + hand_r * 0.35), -sin(r_arm_ang) * (arm_h + hand_r * 0.35) + 0.02)

func update_people_animation(delta: float) -> void:
	if player == null or player_visual == null:
		return
	var cur_xz := player_xz()
	var moved_dist := 0.0 if last_player_anim_xz.x == INF else cur_xz.distance_to(last_player_anim_xz)
	last_player_anim_xz = cur_xz
	var is_moving := moved_dist > 0.002 or not current_path.is_empty()
	var target_stride := 1.0 if is_moving else 0.0
	player_stride_blend = move_toward(player_stride_blend, target_stride, delta * 8.0)
	walk_anim_clock = wrapf(walk_anim_clock + delta * (9.5 if is_moving else 3.2), 0.0, TAU * 20.0)
	var player_talk_gesture := 0.55 if (arrived_neighbor >= 0 or arrived_mural or arrived_speaker) and not is_moving else 0.0
	animate_person_node(player_visual, walk_anim_clock, player_stride_blend, player_talk_gesture)
	for i in range(neighbor_nodes.size()):
		var n_node := neighbor_nodes[i]
		if n_node == null:
			continue
		var n_xz := neighbor_xz(i)
		var d_player := cur_xz.distance_to(n_xz)
		var engaged := (arrived_neighbor == i) or (selected_neighbor == i) or (d_player <= 6.5)
		if engaged and d_player > 0.05:
			var to_p := cur_xz - n_xz
			var desired_yaw := atan2(to_p.x, to_p.y)
			n_node.rotation.y = lerp_angle(n_node.rotation.y, desired_yaw, clampf(delta * 6.5, 0.0, 1.0))
		var n_gesture := 0.85 if arrived_neighbor == i else (0.45 if engaged else 0.14)
		animate_person_node(n_node, walk_anim_clock * 0.65 + float(i) * 1.3, 0.0, n_gesture)
	for m_i in range(concert_musician_nodes.size()):
		var m_node := concert_musician_nodes[m_i]
		if m_node != null:
			animate_person_node(m_node, walk_anim_clock * 1.15 + float(m_i) * 1.1, 0.22, 0.65)
	for c_i in range(concert_crowd_nodes.size()):
		var c_node := concert_crowd_nodes[c_i]
		if c_node != null:
			animate_person_node(c_node, walk_anim_clock * 0.95 + float(c_i) * 1.7, 0.18, 0.45)
	for d_i in range(drag_performer_nodes.size()):
		var d_node := drag_performer_nodes[d_i]
		if d_node != null:
			animate_person_node(d_node, walk_anim_clock * 1.55 + float(d_i) * 1.4, 0.48, 0.92)
			d_node.rotation.y = sin(walk_anim_clock * 1.2 + float(d_i) * PI) * 0.36
	if viking_biker_node != null:
		animate_person_node(viking_biker_node, walk_anim_clock * 1.35 + 0.8, 0.12, 0.72)
		viking_biker_node.position.y = 0.18 + absf(sin(walk_anim_clock * 4.5)) * 0.035
	if viking_bike_mesh != null:
		viking_bike_mesh.position.y = absf(sin(walk_anim_clock * 4.5)) * 0.025
		viking_bike_mesh.rotation.z = sin(walk_anim_clock * 2.2) * 0.025
	if surprise_vinyl_mesh != null:
		surprise_vinyl_mesh.rotation.y = wrapf(surprise_vinyl_mesh.rotation.y + delta * 2.6, -PI, PI)
	if jeffrey_turntable_disc_mesh != null and jeffrey_turntable_node != null and jeffrey_turntable_node.visible:
		jeffrey_turntable_disc_mesh.rotation.y = wrapf(jeffrey_turntable_disc_mesh.rotation.y + delta * (3.6 if music_playing else 1.6), -PI, PI)
	if celeste_dino_figurine_node != null and celeste_dino_figurine_node.visible:
		celeste_dino_figurine_node.position.y = 0.88 + absf(sin(walk_anim_clock * 4.8)) * 0.035
		if celeste_dino_tail_node != null:
			celeste_dino_tail_node.rotation.y = deg_to_rad(-35.0) + sin(walk_anim_clock * 6.4) * 0.32
	if rook_clown_horn_bulb_mesh != null and rook_clown_horn_node != null and rook_clown_horn_node.visible:
		var h_sq := 1.0 + sin(walk_anim_clock * 6.5) * 0.18
		rook_clown_horn_bulb_mesh.scale = Vector3(h_sq, 1.0 / h_sq, h_sq)
	if dez_carpet_keepsake_node != null and dez_carpet_keepsake_node.visible:
		dez_carpet_keepsake_node.position.y = 0.14 + sin(walk_anim_clock * 2.8) * 0.035
		dez_carpet_keepsake_node.rotation.z = cos(walk_anim_clock * 1.9) * 0.06
	if cutesy_dino_node != null:
		cutesy_dino_node.position.y = absf(sin(walk_anim_clock * 5.2)) * 0.14
		cutesy_dino_node.rotation.z = sin(walk_anim_clock * 2.6) * 0.11
		cutesy_dino_node.rotation.y = sin(walk_anim_clock * 1.5) * 0.28
	if cutesy_dino_tail_node != null:
		cutesy_dino_tail_node.rotation.y = sin(walk_anim_clock * 6.4) * 0.35
	if magic_carpet_chef_node != null:
		magic_carpet_chef_node.position.y = 1.15 + sin(walk_anim_clock * 2.8) * 0.24
		magic_carpet_chef_node.rotation.x = sin(walk_anim_clock * 2.1) * 0.09
		magic_carpet_chef_node.rotation.z = cos(walk_anim_clock * 1.9) * 0.08
	if magic_carpet_chef_person != null:
		animate_person_node(magic_carpet_chef_person, walk_anim_clock * 1.8 + 0.5, 0.25, 0.96)
	if clown_horn_walker_node != null:
		animate_person_node(clown_horn_walker_node, walk_anim_clock * 1.65, 0.55, 0.88)
		clown_horn_walker_node.position.x = sin(walk_anim_clock * 1.2) * 0.42
	if clown_horn_bulb_mesh != null:
		var sq := 1.0 + sin(walk_anim_clock * 6.5) * 0.22
		clown_horn_bulb_mesh.scale = Vector3(sq, 1.0 / sq, sq)
	if mayor_event_speaker_node != null:
		animate_person_node(mayor_event_speaker_node, walk_anim_clock * 1.25 + 0.3, 0.15, 0.92)
	if mayor_fanfare_bugler_node != null:
		animate_person_node(mayor_fanfare_bugler_node, walk_anim_clock * 1.45 + 1.1, 0.20, 0.78)
	if mayor_scissors_node != null:
		mayor_scissors_node.rotation_degrees.z = sin(walk_anim_clock * 3.8) * 18.0

## Hand-placed sidewalk props that fall inside a measured footprint are moved onto the sidewalk.
func sidewalk_safe_point(p: Vector3) -> Vector3:
	var xz := Vector2(p.x, p.z)
	if building_containing_point(xz) == "":
		return p
	var sp := nearest_street_point(xz)
	var away := xz - sp
	if away.length_squared() < 1e-6:
		return p
	var fixed := sp + away.normalized() * 6.6
	return Vector3(fixed.x, p.y, fixed.y)

func tl145_record() -> Dictionary:
	for a_rec in lidar_additions:
		if String(a_rec.get("address", "")) == TL145_ADDRESS:
			return a_rec
	return {}

## The Leavenworth (east-most) edge of TL Residences: north end at the entrance, unit direction south.
func tl145_front_facade() -> Dictionary:
	var rec := tl145_record()
	if rec.is_empty():
		return {}
	var ring: Array = rec.polygons[0].rings[0]
	var best := {}
	var best_x := -INF
	for i in range(ring.size()):
		var a := Vector2(ring[i][0], ring[i][1])
		var b := Vector2(ring[(i + 1) % ring.size()][0], ring[(i + 1) % ring.size()][1])
		if a.distance_to(b) < 8.0 or (a.x + b.x) * 0.5 <= best_x:
			continue
		best_x = (a.x + b.x) * 0.5
		var north := a if a.y < b.y else b
		var south := b if a.y < b.y else a
		best = {"north": north, "south": south, "dir": (south - north).normalized(), "length": a.distance_to(b)}
	return best

## Main roof of TL Residences: its highest measured LiDAR roof part, or the median roof.
func tl145_roof_top() -> float:
	var rec := tl145_record()
	if rec.is_empty():
		return 0.0
	var top := float(rec.height_m)
	for m in rec.get("masses", []):
		top = maxf(top, float(m.h))
	return top

## Floor level of a window row above the TL145 storefront (rows counted in the creator's photo).
func tl145_row_floor_y(row: int) -> float:
	var top := tl145_roof_top()
	return TL145_STOREFRONT_M + float(row - 1) * (top - TL145_STOREFRONT_M) / float(TL145_PHOTO_ROWS)

## Largest rectangle (from the wanted size down) along the polygon's longest edge that keeps every
## corner inside with the given edge clearance. Centers come from a 9x9 interior grid, nearest the
## polygon's area centroid first; {} if nothing fits.
func fit_roof_rect(polygon: Dictionary, want_len: float, want_wid: float, clearance: float) -> Dictionary:
	var ring: Array = polygon.rings[0]
	var axis := Vector2.RIGHT
	var longest := 0.0
	var rect := Rect2(Vector2(ring[0][0], ring[0][1]), Vector2.ZERO)
	var area_c := Vector2.ZERO
	var area_sum := 0.0
	for i in range(ring.size()):
		var a := Vector2(ring[i][0], ring[i][1])
		var b := Vector2(ring[(i + 1) % ring.size()][0], ring[(i + 1) % ring.size()][1])
		rect = rect.expand(a)
		var cr := a.x * b.y - b.x * a.y
		area_sum += cr
		area_c += (a + b) * cr
		if a.distance_to(b) > longest:
			longest = a.distance_to(b)
			axis = (b - a).normalized()
	var centroid := area_c / (3.0 * area_sum) if absf(area_sum) > 1e-6 else rect.get_center()
	var perp := Vector2(-axis.y, axis.x)
	var cands: Array[Vector2] = [centroid]
	for gx in range(9):
		for gz in range(9):
			var cand := rect.position + Vector2(rect.size.x * (float(gx) + 0.5) / 9.0, rect.size.y * (float(gz) + 0.5) / 9.0)
			if is_point_in_building_polygon(cand, polygon):
				cands.append(cand)
	cands.sort_custom(func(p: Vector2, q: Vector2) -> bool: return p.distance_squared_to(centroid) < q.distance_squared_to(centroid))
	for scale in [1.0, 0.85, 0.7, 0.55, 0.4]:
		var hl: float = want_len * scale * 0.5
		var hw: float = want_wid * scale * 0.5
		for center in cands:
			var ok := is_point_in_building_polygon(center, polygon)
			for corner in [center + axis * hl + perp * hw, center + axis * hl - perp * hw, center - axis * hl + perp * hw, center - axis * hl - perp * hw]:
				if not ok:
					break
				ok = is_point_in_building_polygon(corner, polygon) and polygon_edge_clearance(corner, polygon) >= clearance
			if ok:
				return {"center": center, "axis": axis, "perp": perp, "len": hl * 2.0, "wid": hw * 2.0}
	return {}

## Creator-reported rooftop spaces at 145 Leavenworth: TL Residences' rooftop dog park with greenery and
## a fire pit, and across the street the canopy-covered rooftop playground with green turf at Compass
## Children's Center, under a mesh (net) canopy. Their existence comes from the creator; layout, sizes, and canopy height are stylized.
func build_creator_rooftops() -> void:
	var root := Node3D.new()
	root.name = "CreatorRooftops"
	add_child(root)
	var tl := tl145_record()
	if not tl.is_empty():
		var top := tl145_roof_top()
		var deck: Dictionary = tl.polygons[0]
		for m in tl.get("masses", []):
			if is_equal_approx(float(m.h), top):
				deck = {"rings": m.rings}
		var r := fit_roof_rect(deck, 10.0, 6.0, 0.9)
		if r.is_empty():
			# No room on the measured top part: use the whole roof at its median height.
			top = float(tl.height_m)
			r = fit_roof_rect(tl.polygons[0], 10.0, 6.0, 0.9)
		if not r.is_empty():
			var sf := SurfaceTool.new()
			sf.begin(Mesh.PRIMITIVE_TRIANGLES)
			sf.set_smooth_group(-1)
			var c: Vector2 = r.center
			var ax: Vector2 = r.axis
			var pp: Vector2 = r.perp
			var y := top + 0.02
			colored_box(sf, Vector3(c.x, y + 0.04, c.y), Vector3(float(r.len) * 0.5, 0.04, float(r.wid) * 0.5), ax, Color("4f7d43"), Color("6a9f55"))
			for side in [-1.0, 1.0]:
				for k in range(3):
					var t := (float(k) - 1.0) * float(r.len) * 0.32
					var pc: Vector2 = c + ax * t + pp * side * (float(r.wid) * 0.5 - 0.35)
					colored_box(sf, Vector3(pc.x, y + 0.3, pc.y), Vector3(0.6, 0.22, 0.25), ax, Color("4a4f52"), Color("5c4a3a"))
					colored_prism(sf, Vector3(pc.x, y + 0.52, pc.y), 0.34, 0.12, 0.75, 7, Color("4f8a45"), Color("67a457"))
			var fp: Vector2 = c - ax * (float(r.len) * 0.28)
			colored_prism(sf, Vector3(fp.x, y + 0.08, fp.y), 0.72, 0.68, 0.36, 10, Color("5a5550"), Color("3d3936"))
			colored_prism(sf, Vector3(fp.x, y + 0.44, fp.y), 0.46, 0.18, 0.28, 8, glass_flag(Color("ff8a3d"), true), glass_flag(Color("ffc06a"), true))
			for b_i in range(3):
				var ang := TAU * float(b_i) / 3.0 + 0.4
				var bd := Vector2(cos(ang), sin(ang))
				var bc: Vector2 = fp + bd * 1.55
				colored_box(sf, Vector3(bc.x, y + 0.22, bc.y), Vector3(0.55, 0.2, 0.18), Vector2(-bd.y, bd.x), Color("7a5a3e"), Color("9a7550"))
			sf.generate_normals()
			var dog := MeshInstance3D.new()
			dog.name = "TL145DogPark"
			dog.mesh = sf.commit()
			dog.material_override = building_material()
			root.add_child(dog)
			root.add_child(make_label_3d("TL145DogParkLabel", "Rooftop dog park & fire pit", Vector3(c.x, top + 2.3, c.y), Color("d9f2c4"), 0.0105, 20))
	var compass: Dictionary = {}
	for b in all_buildings:
		if String(b.id) == COMPASS_ROOF_ID:
			compass = b
	if not compass.is_empty() and not compass.polygons.is_empty():
		var h := float(compass.height_m)
		var poly: Dictionary = compass.polygons[0]
		var sp := SurfaceTool.new()
		sp.begin(Mesh.PRIMITIVE_TRIANGLES)
		sp.set_smooth_group(-1)
		var turf := Color("63b34a")
		for t_i in range(0, poly.triangles.size(), 3):
			for k in range(3):
				sp.set_color(turf)
				sp.add_vertex(point(poly.vertices[poly.triangles[t_i + k]], h + 0.05))
		var cr := fit_roof_rect(poly, 15.0, 9.0, 0.8)
		if not cr.is_empty():
			var cc: Vector2 = cr.center
			var cax: Vector2 = cr.axis
			var cpp: Vector2 = cr.perp
			var ch := h + 2.7
			# Mesh (net) canopy on a frame: strands every ~0.9 m, so the turf and play pieces show through.
			var net_col := Color("3c4246")
			var hl3 := Vector3(cax.x, 0.0, cax.y) * float(cr.len) * 0.5
			var hw3 := Vector3(cpp.x, 0.0, cpp.y) * float(cr.wid) * 0.5
			var c3 := Vector3(cc.x, ch, cc.y)
			for edge in [[c3 - hl3 - hw3, c3 + hl3 - hw3], [c3 - hl3 + hw3, c3 + hl3 + hw3], [c3 - hl3 - hw3, c3 - hl3 + hw3], [c3 + hl3 - hw3, c3 + hl3 + hw3]]:
				colored_beam(sp, edge[0], edge[1], 0.09, Color("5f666a"))
			var n_l := int(float(cr.len) / 0.9)
			for i_n in range(1, n_l):
				var off := hl3 * (2.0 * float(i_n) / float(n_l) - 1.0)
				colored_beam(sp, c3 + off - hw3, c3 + off + hw3, 0.03, net_col)
			var n_w := int(float(cr.wid) / 0.9)
			for i_n in range(1, n_w):
				var off_w := hw3 * (2.0 * float(i_n) / float(n_w) - 1.0)
				colored_beam(sp, c3 + off_w - hl3, c3 + off_w + hl3, 0.03, net_col)
			for i_l in [-0.5, 0.0, 0.5]:
				for i_w in [-0.5, 0.5]:
					var pc: Vector2 = cc + cax * float(cr.len) * float(i_l) + cpp * float(cr.wid) * float(i_w)
					colored_prism(sp, Vector3(pc.x, h + 0.05, pc.y), 0.08, 0.08, 2.62, 6, Color("6d7275"), Color("6d7275"))
			var climb: Vector2 = cc + cax * float(cr.len) * 0.22
			colored_box(sp, Vector3(climb.x, h + 0.8, climb.y), Vector3(0.8, 0.75, 0.7), cax, Color("3a8fd0"), Color("2f78b0"))
			var slide: Vector2 = climb + cpp * 1.2
			colored_box(sp, Vector3(slide.x, h + 0.35, slide.y), Vector3(0.9, 0.3, 0.3), cpp, Color("e0703c"), Color("f08a52"))
			var house: Vector2 = cc - cax * float(cr.len) * 0.24
			colored_box(sp, Vector3(house.x, h + 0.6, house.y), Vector3(0.7, 0.55, 0.7), cax, Color("f2b84b"), Color("d9573f"))
		sp.generate_normals()
		var play := MeshInstance3D.new()
		play.name = "CompassRooftopPlayground"
		play.mesh = sp.commit()
		play.material_override = building_material()
		root.add_child(play)
		var lc := Vector2.ZERO
		for v in poly.rings[0]:
			lc += Vector2(v[0], v[1])
		lc /= float(poly.rings[0].size())
		root.add_child(make_label_3d("CompassPlaygroundLabel", "Compass Children's Center · rooftop playground", Vector3(lc.x, h + 4.2, lc.y), Color("d9f2c4"), 0.0105, 20))

func build_street_life_decor() -> void:
	concert_musician_nodes.clear()
	concert_crowd_nodes.clear()
	street_lamp_points.clear()
	planter_canopy_nodes.clear()
	planter_canopy_base.clear()
	var decor_root := Node3D.new()
	decor_root.name = "StreetLifeDecor"
	# 1. Dodge Alley Block Concert (Dodge Place off north side of 400 block of Turk St near Hyde)
	var concert := Node3D.new()
	concert.name = "DodgeAlleyConcert"
	concert.position = Vector3(-414.0, 0.0, 56.0)
	concert.scale = Vector3(1.85, 1.85, 1.85)
	var stage_deck := MeshInstance3D.new()
	stage_deck.name = "StageDeck"
	var deck_box := BoxMesh.new()
	deck_box.size = Vector3(4.6, 0.26, 2.8)
	stage_deck.mesh = deck_box
	stage_deck.position = Vector3(0.0, 0.13, 0.0)
	stage_deck.material_override = material(Color("7a563c"))
	concert.add_child(stage_deck)
	var stage_trim := MeshInstance3D.new()
	var trim_box := BoxMesh.new()
	trim_box.size = Vector3(4.64, 0.08, 2.84)
	stage_trim.mesh = trim_box
	stage_trim.position = Vector3(0.0, 0.24, 0.0)
	stage_trim.material_override = mural_material(Color("f5d57a"))
	concert.add_child(stage_trim)
	var backdrop := MeshInstance3D.new()
	backdrop.name = "StageBackdrop"
	var back_box := BoxMesh.new()
	back_box.size = Vector3(4.4, 2.35, 0.16)
	backdrop.mesh = back_box
	backdrop.position = Vector3(0.0, 1.44, -1.32)
	backdrop.material_override = material(Color("23474b"))
	concert.add_child(backdrop)
	for slat_i in range(5):
		var slat := MeshInstance3D.new()
		var slat_box := BoxMesh.new()
		slat_box.size = Vector3(0.18, 1.85, 0.08)
		slat.mesh = slat_box
		slat.position = Vector3(-1.60 + float(slat_i) * 0.80, 1.44, -1.21)
		slat.material_override = mural_material(Color("f8cc58") if slat_i % 2 == 0 else Color("ee835c"))
		concert.add_child(slat)
	for post_x in [-2.15, 2.15]:
		var post := MeshInstance3D.new()
		var post_box := BoxMesh.new()
		post_box.size = Vector3(0.12, 3.10, 0.12)
		post.mesh = post_box
		post.position = Vector3(post_x, 1.55, 1.25)
		post.material_override = material(Color("3b494c"))
		concert.add_child(post)
		var mon := MeshInstance3D.new()
		var mon_box := BoxMesh.new()
		mon_box.size = Vector3(0.56, 0.34, 0.42)
		mon.mesh = mon_box
		mon.position = Vector3(post_x * 0.65, 0.43, 1.05)
		mon.material_override = material(Color("2e3538"))
		concert.add_child(mon)
	var arch_bar := MeshInstance3D.new()
	arch_bar.name = "ConcertLightArch"
	var arch_box := BoxMesh.new()
	arch_box.size = Vector3(4.50, 0.14, 0.14)
	arch_bar.mesh = arch_box
	arch_bar.position = Vector3(0.0, 3.12, 1.25)
	arch_bar.material_override = mural_material(Color("5fd4ba"))
	concert.add_child(arch_bar)
	var bulb_cols: Array[Color] = [Color("ffe394"), Color("ee835c"), Color("5fd4ba"), Color("f8cc58"), Color("ffe394")]
	for b_i in range(bulb_cols.size()):
		var bulb := MeshInstance3D.new()
		var b_sphere := SphereMesh.new()
		b_sphere.radius = 0.13
		b_sphere.height = 0.26
		bulb.mesh = b_sphere
		bulb.position = Vector3(-1.76 + float(b_i) * 0.88, 2.94, 1.25)
		bulb.material_override = mural_material(bulb_cols[b_i])
		concert.add_child(bulb)
	concert.add_child(make_label_3d("ConcertBannerLabel", "Dodge Alley Block Concert · Live Jazz", Vector3(0.0, 3.65, 0.60), Color("ffe394"), 0.012, 24))
	# 3-piece Dodge Alley jazz combo on stage
	var bassist := make_person_node("ConcertBassist", Color("c86d51"), Color("8d5b3e"), Color("222629"), 1.68, false)
	bassist.position = Vector3(-1.35, 0.26, -0.20)
	var bass_body := MeshInstance3D.new()
	var bb_box := BoxMesh.new()
	bb_box.size = Vector3(0.36, 0.88, 0.20)
	bass_body.mesh = bb_box
	bass_body.position = Vector3(0.30, 0.62, 0.22)
	bass_body.material_override = material(Color("8c4b2b"))
	bassist.add_child(bass_body)
	concert.add_child(bassist)
	concert_musician_nodes.append(bassist)
	var horn_player := make_person_node("ConcertHornPlayer", Color("49877a"), Color("b9825f"), Color("2f251e"), 1.70, false)
	horn_player.position = Vector3(0.0, 0.26, -0.05)
	var sax := MeshInstance3D.new()
	var sax_box := BoxMesh.new()
	sax_box.size = Vector3(0.12, 0.46, 0.22)
	sax.mesh = sax_box
	sax.position = Vector3(0.14, 1.04, 0.28)
	sax.material_override = mural_material(Color("f8cc58"))
	horn_player.add_child(sax)
	concert.add_child(horn_player)
	concert_musician_nodes.append(horn_player)
	var drummer := make_person_node("ConcertDrummer", Color("d49b4b"), Color("6e4730"), Color("1e2224"), 1.66, false)
	drummer.position = Vector3(1.35, 0.26, -0.25)
	var drum_shell := MeshInstance3D.new()
	var ds_cyl := CylinderMesh.new()
	ds_cyl.top_radius = 0.28
	ds_cyl.bottom_radius = 0.28
	ds_cyl.height = 0.36
	drum_shell.mesh = ds_cyl
	drum_shell.position = Vector3(-0.10, 0.42, 0.42)
	drum_shell.material_override = material(Color("d96b43"))
	drummer.add_child(drum_shell)
	var cymbal := MeshInstance3D.new()
	var cym_cyl := CylinderMesh.new()
	cym_cyl.top_radius = 0.24
	cym_cyl.bottom_radius = 0.24
	cym_cyl.height = 0.03
	cymbal.mesh = cym_cyl
	cymbal.position = Vector3(-0.38, 0.92, 0.42)
	cymbal.material_override = mural_material(Color("f5d57a"))
	drummer.add_child(cymbal)
	concert.add_child(drummer)
	concert_musician_nodes.append(drummer)
	# Two sidewalk listeners in the Dodge Alley apron (north of z=58.05, clear of Turk St route)
	var listener_a := make_person_node("ConcertListener1", Color("6b8e78"), Color("c48f6b"), Color("322822"), 1.66, false)
	listener_a.position = Vector3(-2.15, 0.0, 2.00)
	listener_a.rotation.y = PI
	concert.add_child(listener_a)
	concert_crowd_nodes.append(listener_a)
	var listener_b := make_person_node("ConcertListener2", Color("b56c82"), Color("825439"), Color("23272a"), 1.68, false)
	listener_b.position = Vector3(2.15, 0.0, 2.00)
	listener_b.rotation.y = PI
	concert.add_child(listener_b)
	concert_crowd_nodes.append(listener_b)
	decor_root.add_child(concert)

	# 2. Warm sidewalk globe streetlamps & timber planter trees along Turk & Taylor and West Turk
	var lamp_coords: Array[Vector3] = [
		Vector3(36.0, 0.0, 4.2),
		Vector3(62.0, 0.0, 4.2),
		Vector3(96.0, 0.0, 4.2),
		Vector3(19.5, 0.0, 20.0),
		Vector3(-92.0, 0.0, 22.0),
		Vector3(-232.0, 0.0, 40.0),
		Vector3(-398.0, 0.0, 58.2)
	]
	for l_idx in range(lamp_coords.size()):
		lamp_coords[l_idx] = sidewalk_safe_point(lamp_coords[l_idx])
		var lamp := Node3D.new()
		lamp.name = "StreetLamp_%d" % l_idx
		lamp.position = lamp_coords[l_idx]
		var pole := MeshInstance3D.new()
		var pole_cyl := CylinderMesh.new()
		pole_cyl.top_radius = 0.06
		pole_cyl.bottom_radius = 0.09
		pole_cyl.height = 3.4
		pole.mesh = pole_cyl
		pole.position = Vector3(0.0, 1.7, 0.0)
		pole.material_override = material(Color("384649"))
		lamp.add_child(pole)
		var globe := MeshInstance3D.new()
		var g_sphere := SphereMesh.new()
		g_sphere.radius = 0.22
		g_sphere.height = 0.44
		globe.mesh = g_sphere
		globe.position = Vector3(0.0, 3.52, 0.0)
		globe.material_override = mural_material(Color("ffe8a3"))
		lamp.add_child(globe)
		decor_root.add_child(lamp)
		street_lamp_points.append(Vector2(lamp_coords[l_idx].x, lamp_coords[l_idx].z))

	var planter_coords: Array[Vector3] = [
		Vector3(44.0, 0.0, 4.0),
		Vector3(82.0, 0.0, 4.0),
		Vector3(19.8, 0.0, 32.0),
		Vector3(-156.0, 0.0, 30.5),
		Vector3(-406.0, 0.0, 57.6)
	]
	for p_idx in range(planter_coords.size()):
		var planter := Node3D.new()
		planter.name = "StreetPlanter_%d" % p_idx
		planter.position = sidewalk_safe_point(planter_coords[p_idx])
		var box_inst := MeshInstance3D.new()
		var p_box := BoxMesh.new()
		p_box.size = Vector3(0.92, 0.46, 0.92)
		box_inst.mesh = p_box
		box_inst.position = Vector3(0.0, 0.23, 0.0)
		box_inst.material_override = material(Color("6d4f38"))
		planter.add_child(box_inst)
		var trunk := MeshInstance3D.new()
		var t_cyl := CylinderMesh.new()
		t_cyl.top_radius = 0.08
		t_cyl.bottom_radius = 0.11
		t_cyl.height = 1.35
		trunk.mesh = t_cyl
		trunk.position = Vector3(0.0, 1.10, 0.0)
		trunk.material_override = material(Color("5a402d"))
		planter.add_child(trunk)
		var canopy := MeshInstance3D.new()
		canopy.name = "Canopy"
		var c_sphere := SphereMesh.new()
		c_sphere.radius = 0.78
		c_sphere.height = 1.42
		canopy.mesh = c_sphere
		canopy.position = Vector3(0.0, 2.15, 0.0)
		canopy.material_override = material(Color("4e7d5c") if p_idx % 2 == 0 else Color("5c8d67"))
		planter.add_child(canopy)
		planter_canopy_nodes.append(canopy)
		planter_canopy_base.append(canopy.position)
		decor_root.add_child(planter)

	var so_what_root := Node3D.new()
	so_what_root.name = "SoWhatEasterEgg"
	# Both pieces sit on the real TL Residences facades (OSM way 1059931715 at 361 Turk St and way
	# 1258857968 at 145 Leavenworth St, see data/lidar_2023.json), turned 0.16 rad to the street grid.
	var turk_awning := Node3D.new()
	turk_awning.name = "SoWhatAwning_361Turk"
	turk_awning.position = Vector3(-372.48, 0.0, 69.96)
	turk_awning.rotation.y = 0.1599
	var canopy_frame := MeshInstance3D.new()
	var c_box := BoxMesh.new()
	c_box.size = Vector3(6.4, 0.22, 1.8)
	canopy_frame.mesh = c_box
	canopy_frame.position = Vector3(0.0, 3.55, 0.0)
	canopy_frame.material_override = mural_material(Color("1c2842"))
	turk_awning.add_child(canopy_frame)
	for post_x in [-2.85, 2.85]:
		var post := MeshInstance3D.new()
		var p_cyl := CylinderMesh.new()
		p_cyl.top_radius = 0.06
		p_cyl.bottom_radius = 0.07
		p_cyl.height = 3.5
		post.mesh = p_cyl
		post.position = Vector3(post_x, 1.75, -0.78)
		post.material_override = mural_material(Color("d6a848"))
		turk_awning.add_child(post)
	var so_what_heights: Array[float] = [0.42, 0.56, 0.72, 0.64, 0.96, 0.82, 1.08, 0.92]
	var so_what_y_offsets: Array[float] = [3.62, 3.68, 3.76, 3.72, 3.92, 3.84, 4.02, 3.90]
	for b_idx in range(so_what_heights.size()):
		var bar := MeshInstance3D.new()
		bar.name = "SoWhatChordBar_%d" % b_idx
		var b_mesh := BoxMesh.new()
		var is_horn_chord := b_idx in [4, 6]
		b_mesh.size = Vector3(0.54 if is_horn_chord else 0.34, so_what_heights[b_idx], 0.16)
		bar.mesh = b_mesh
		bar.position = Vector3(-2.45 + float(b_idx) * 0.70, so_what_y_offsets[b_idx], -0.88)
		bar.material_override = mural_material(Color("f3c458") if is_horn_chord else Color("5ec2c6"))
		turk_awning.add_child(bar)
	var turk_lbl := make_label_3d("AwningLabel361Turk", "361 Turk · 'So What' Awning", Vector3(0.0, 4.7, -0.85), Color("ffe699"), 0.012, 22)
	turk_awning.add_child(turk_lbl)
	so_what_root.add_child(turk_awning)

	# The canopy sits at the entrance under the "TL145" sign (north end of the front facade); the lit
	# window is the creator's apartment, 8th row above the sign in the left (south) bay.
	var leav_node := Node3D.new()
	leav_node.name = "EighthFloor_145Leavenworth"
	leav_node.position = Vector3(-292.02, 0.0, 92.61)
	leav_node.rotation.y = 0.1593
	var floor8_y := 21.9
	var win_z := 0.0
	var front := tl145_front_facade()
	if not front.is_empty():
		var f_dir: Vector2 = front.dir
		var f_ent: Vector2 = Vector2(front.north) + f_dir * TL145_ENTRANCE_M
		leav_node.position = Vector3(f_ent.x, 0.0, f_ent.y)
		leav_node.rotation.y = atan2(f_dir.x, f_dir.y)
		win_z = float(front.length) - TL145_LEFT_BAY_M - TL145_ENTRANCE_M
		floor8_y = tl145_row_floor_y(TL145_CREATOR_ROW)
	var leav_canopy := MeshInstance3D.new()
	var lc_box := BoxMesh.new()
	lc_box.size = Vector3(1.6, 0.20, 4.2)
	leav_canopy.mesh = lc_box
	leav_canopy.position = Vector3(0.0, 3.55, 0.0)
	leav_canopy.material_override = mural_material(Color("1c2842"))
	leav_node.add_child(leav_canopy)
	for chord_idx in range(2):
		var l_bar := MeshInstance3D.new()
		var lb_box := BoxMesh.new()
		lb_box.size = Vector3(0.16, 0.88 if chord_idx == 0 else 1.02, 0.56)
		l_bar.mesh = lb_box
		l_bar.position = Vector3(0.82, 3.85 + float(chord_idx) * 0.10, -0.55 + float(chord_idx) * 1.10)
		l_bar.material_override = mural_material(Color("f3c458") if chord_idx == 1 else Color("5ec2c6"))
		leav_node.add_child(l_bar)
	var eighth_win := MeshInstance3D.new()
	eighth_win.name = "EighthFloorWindow"
	var ew_box := BoxMesh.new()
	ew_box.size = Vector3(1.15, 2.15, 2.65)
	eighth_win.mesh = ew_box
	eighth_win.position = Vector3(0.35, floor8_y + 1.3, win_z)
	eighth_win.material_override = mural_material(Color("ffe082"))
	leav_node.add_child(eighth_win)
	var balcony := MeshInstance3D.new()
	var bal_box := BoxMesh.new()
	bal_box.size = Vector3(1.38, 0.46, 2.85)
	balcony.mesh = bal_box
	balcony.position = Vector3(0.45, floor8_y + 0.35, win_z)
	balcony.material_override = mural_material(Color("2b3648"))
	leav_node.add_child(balcony)
	var turntable_lamp := MeshInstance3D.new()
	var tl_cyl := CylinderMesh.new()
	tl_cyl.top_radius = 0.36
	tl_cyl.bottom_radius = 0.24
	tl_cyl.height = 0.45
	turntable_lamp.mesh = tl_cyl
	turntable_lamp.position = Vector3(0.65, floor8_y + 1.05, win_z)
	turntable_lamp.material_override = mural_material(Color("ff9e5e"))
	leav_node.add_child(turntable_lamp)
	var leav_lbl := make_label_3d("EighthFloorLabel", "145 Leavenworth · 8th Floor ('So What')", Vector3(1.2, floor8_y + 4.4, win_z), Color("ffe8a3"), 0.012, 24)
	leav_node.add_child(leav_lbl)
	so_what_root.add_child(leav_node)
	decor_root.add_child(so_what_root)

	# Tenderloin Museum at the Cadillac Hotel (398 Eddy St, footprint 201006.0001559)
	# Central Adventure Info Hub & Living Archive Time-Travel Portal
	var museum_root := Node3D.new()
	museum_root.name = "TenderloinMuseumHub"
	museum_root.position = MUSEUM_HUB_POS
	museum_root.scale = Vector3(1.75, 1.75, 1.75)
	var museum_marquee := MeshInstance3D.new()
	museum_marquee.name = "MuseumMarquee"
	var mm_box := BoxMesh.new()
	mm_box.size = Vector3(5.8, 0.24, 1.8)
	museum_marquee.mesh = mm_box
	museum_marquee.position = Vector3(0.0, 3.65, 0.0)
	museum_marquee.material_override = mural_material(Color("f4d06f"))
	museum_root.add_child(museum_marquee)
	var blade_sign := MeshInstance3D.new()
	blade_sign.name = "MuseumBladeSign"
	var bs_box := BoxMesh.new()
	bs_box.size = Vector3(0.45, 2.6, 0.95)
	blade_sign.mesh = bs_box
	blade_sign.position = Vector3(-2.6, 4.8, 0.6)
	blade_sign.material_override = mural_material(Color("4fc3c7"))
	museum_root.add_child(blade_sign)
	for g_idx in range(2):
		var gal_win := MeshInstance3D.new()
		gal_win.name = "GalleryWindow_%d" % g_idx
		var gw_box := BoxMesh.new()
		gw_box.size = Vector3(1.9, 1.8, 0.18)
		gal_win.mesh = gw_box
		gal_win.position = Vector3(-1.3 + float(g_idx) * 2.6, 1.75, -0.35)
		gal_win.material_override = mural_material(Color("ffe699") if g_idx == 0 else Color("8de4e8"))
		museum_root.add_child(gal_win)
	var docent_node := make_person_node("MuseumDocent", Color("3b6e75"), Color("c68b63"), Color("2a2623"), 1.69, false)
	docent_node.position = Vector3(-1.4, 0.0, 1.15)
	docent_node.scale = Vector3(1.45, 1.45, 1.45)
	museum_root.add_child(docent_node)
	var kiosk := MeshInstance3D.new()
	kiosk.name = "MuseumInfoKiosk"
	var k_box := BoxMesh.new()
	k_box.size = Vector3(0.75, 1.15, 0.55)
	kiosk.mesh = k_box
	kiosk.position = Vector3(-0.35, 0.58, 1.2)
	kiosk.material_override = mural_material(Color("e6b35a"))
	museum_root.add_child(kiosk)
	var portal_root := Node3D.new()
	portal_root.name = "ArchiveTimePortal"
	portal_root.position = Vector3(2.3, 0.0, 0.8)
	portal_ring_meshes.clear()
	var ring_colors: Array[Color] = [Color("f3c458"), Color("d884b8"), Color("5ec2c6")]
	var ring_radii: Array[float] = [1.55, 1.22, 0.88]
	for r_idx in range(3):
		var ring_mesh := MeshInstance3D.new()
		ring_mesh.name = "PortalRing_%d" % r_idx
		var cyl := CylinderMesh.new()
		cyl.top_radius = ring_radii[r_idx]
		cyl.bottom_radius = ring_radii[r_idx]
		cyl.height = 0.12 + float(r_idx) * 0.04
		ring_mesh.mesh = cyl
		ring_mesh.position = Vector3(0.0, 1.75, float(r_idx) * 0.06)
		ring_mesh.rotation_degrees = Vector3(90.0, 0.0, 0.0)
		ring_mesh.material_override = mural_material(ring_colors[r_idx])
		portal_root.add_child(ring_mesh)
		portal_ring_meshes.append(ring_mesh)
	portal_lens_mesh = MeshInstance3D.new()
	portal_lens_mesh.name = "PortalLens"
	var lens_cyl := CylinderMesh.new()
	lens_cyl.top_radius = 0.72
	lens_cyl.bottom_radius = 0.72
	lens_cyl.height = 0.22
	portal_lens_mesh.mesh = lens_cyl
	portal_lens_mesh.position = Vector3(0.0, 1.75, 0.16)
	portal_lens_mesh.rotation_degrees = Vector3(90.0, 0.0, 0.0)
	portal_lens_mesh.material_override = mural_material(Color("7be0e6"))
	portal_root.add_child(portal_lens_mesh)
	museum_root.add_child(portal_root)
	var museum_lbl := make_label_3d("MuseumHubLabel", "Tenderloin Museum & Info Hub · 398 Eddy (Cadillac Hotel)", Vector3(0.0, 5.2, 0.4), Color("ffe8a3"), 0.012, 23)
	museum_root.add_child(museum_lbl)
	var portal_lbl := make_label_3d("TimePortalLabel", "Living Archive Time-Portal · 1961 / 1966 / 1907", Vector3(2.3, 3.9, 0.8), Color("8de4e8"), 0.011, 20)
	museum_root.add_child(portal_lbl)
	decor_root.add_child(museum_root)

	# Fictional neighborhood bars and eateries. Names were checked against real San Francisco businesses
	# (2026-10-19) to avoid confusion with real places; no star ratings or reviews are shown.
	var eateries_root := Node3D.new()
	eateries_root.name = "NeighborhoodEateries"
	for e_idx in range(NEIGHBORHOOD_EATERIES.size()):
		var e_rec: Dictionary = NEIGHBORHOOD_EATERIES[e_idx]
		var e_node := Node3D.new()
		e_node.name = "Eatery_%s" % String(e_rec.get("id", str(e_idx)))
		e_node.position = e_rec.get("pos", Vector3.ZERO)
		var awning := MeshInstance3D.new()
		awning.name = "StorefrontAwning"
		var aw_box := BoxMesh.new()
		aw_box.size = Vector3(3.8, 0.20, 1.4)
		awning.mesh = aw_box
		awning.position = Vector3(0.0, 3.25, 0.0)
		awning.material_override = mural_material(Color(String(e_rec.get("canopy_color", "d97736"))))
		e_node.add_child(awning)
		var win_glow := MeshInstance3D.new()
		win_glow.name = "WarmStorefrontWindow"
		var wg_box := BoxMesh.new()
		wg_box.size = Vector3(2.8, 1.6, 0.18)
		win_glow.mesh = wg_box
		win_glow.position = Vector3(0.0, 1.65, -0.35)
		win_glow.material_override = mural_material(Color(String(e_rec.get("label_color", "ffd899"))))
		e_node.add_child(win_glow)
		var bistro_tbl := MeshInstance3D.new()
		var bt_cyl := CylinderMesh.new()
		bt_cyl.top_radius = 0.42
		bt_cyl.bottom_radius = 0.32
		bt_cyl.height = 0.78
		bistro_tbl.mesh = bt_cyl
		bistro_tbl.position = Vector3(1.3, 0.39, 0.65)
		bistro_tbl.material_override = mural_material(Color("4a3b32"))
		e_node.add_child(bistro_tbl)
		var e_lbl := make_label_3d("EateryLabel_%d" % e_idx, "%s (fictional)" % String(e_rec.get("name", "")), Vector3(0.0, 4.15, 0.0), Color(String(e_rec.get("label_color", "ffd899"))), 0.0115, 21)
		e_lbl.set_meta("eatery_index", e_idx)
		e_node.add_child(e_lbl)
		eateries_root.add_child(e_node)
	decor_root.add_child(eateries_root)

	add_child(decor_root)

## Muni trolleybus overhead: a contact-wire pair above the travel lanes of Turk and Eddy, span
## wires and hangers between sidewalk poles every ~30 m. The 31 Balboa trolleybus runs through
## the Tenderloin on these streets (inbound on Eddy, outbound on Turk between Larkin and Mason;
## SFMTA route page and Wikipedia "31 Balboa"). Pole spacing and lane side are schematic,
## not a surveyed overhead inventory.
func build_muni_overhead_lines() -> void:
	trolley_pole_points.clear()
	trolley_wire_runs = 0
	var lines_root := Node3D.new()
	lines_root.name = "MuniOverheadLines"
	var pole_st := SurfaceTool.new()
	pole_st.begin(Mesh.PRIMITIVE_TRIANGLES)
	pole_st.set_smooth_group(-1)
	var wire_st := SurfaceTool.new()
	wire_st.begin(Mesh.PRIMITIVE_TRIANGLES)
	wire_st.set_smooth_group(-1)
	var pole_col := Color("3b4744")
	var wire_col := Color("1f2427")
	var area := walk_bounds.grow(-6.0)
	for street in street_ways:
		if not TROLLEY_STREET_NAMES.has(String(street.get("name", ""))):
			continue
		var p2: Array[Vector2] = []
		for p in street.points:
			p2.append(Vector2(float(p[0]), float(p[1])))
		if p2.size() < 2:
			continue
		var normals: Array[Vector2] = []
		for i in range(p2.size()):
			var t_in := (p2[i] - p2[i - 1]).normalized() if i > 0 else Vector2.ZERO
			var t_out := (p2[i + 1] - p2[i]).normalized() if i < p2.size() - 1 else Vector2.ZERO
			var tng := t_in + t_out
			if tng.length_squared() < 1e-8:
				tng = t_out if t_out != Vector2.ZERO else t_in
			tng = tng.normalized()
			normals.append(Vector2(-tng.y, tng.x))
		var walked := 0.0
		var next_at := 14.0
		for i in range(p2.size() - 1):
			var a := p2[i]
			var b := p2[i + 1]
			var seg_len := a.distance_to(b)
			if seg_len < 1e-3:
				continue
			if area.has_point(a) or area.has_point(b):
				for off in TROLLEY_WIRE_OFFSETS_M:
					var wa := a + normals[i] * off
					var wb := b + normals[i + 1] * off
					colored_beam(wire_st, Vector3(wa.x, TROLLEY_WIRE_HEIGHT_M, wa.y), Vector3(wb.x, TROLLEY_WIRE_HEIGHT_M, wb.y), 0.07, wire_col)
				trolley_wire_runs += 1
			var t := (b - a) / seg_len
			var n := Vector2(-t.y, t.x)
			while next_at <= walked + seg_len:
				var s := a + t * (next_at - walked)
				next_at += TROLLEY_POLE_SPACING_M
				if not area.has_point(s):
					continue
				var near_ix := false
				for ix in street_intersections:
					if ix.distance_to(s) < 11.0:
						near_ix = true
						break
				if near_ix:
					continue
				var pl := s + n * TROLLEY_POLE_OFFSET_M
				var pr := s - n * TROLLEY_POLE_OFFSET_M
				if building_containing_point(pl) != "" or building_containing_point(pr) != "":
					continue
				if min_wall_distance(pl, 0.4) < 0.4 or min_wall_distance(pr, 0.4) < 0.4:
					continue
				var near_tree := false
				for tree_pt in street_tree_points:
					if tree_pt.distance_to(pl) < 1.5 or tree_pt.distance_to(pr) < 1.5:
						near_tree = true
						break
				if near_tree:
					continue
				for pp in [pl, pr]:
					colored_prism(pole_st, Vector3(pp.x, 0.0, pp.y), 0.15, 0.10, 7.0, 8, pole_col, pole_col.lightened(0.2))
					trolley_pole_points.append(pp)
				colored_beam(wire_st, Vector3(pl.x, TROLLEY_SPAN_HEIGHT_M, pl.y), Vector3(pr.x, TROLLEY_SPAN_HEIGHT_M, pr.y), 0.06, wire_col)
				for off in TROLLEY_WIRE_OFFSETS_M:
					var hp := s + n * off
					colored_beam(wire_st, Vector3(hp.x, TROLLEY_SPAN_HEIGHT_M, hp.y), Vector3(hp.x, TROLLEY_WIRE_HEIGHT_M, hp.y), 0.04, wire_col)
			walked += seg_len
	pole_st.generate_normals()
	var poles := MeshInstance3D.new()
	poles.name = "TrolleyPoles"
	poles.mesh = pole_st.commit()
	poles.material_override = vertex_color_material()
	lines_root.add_child(poles)
	wire_st.generate_normals()
	var wires := MeshInstance3D.new()
	wires.name = "TrolleyWires"
	wires.mesh = wire_st.commit()
	wires.material_override = vertex_color_material()
	lines_root.add_child(wires)
	add_child(lines_root)

func ensure_tree_resources() -> void:
	if tree_trunk_mesh != null:
		return
	tree_trunk_mesh = CylinderMesh.new()
	tree_trunk_mesh.top_radius = 0.12
	tree_trunk_mesh.bottom_radius = 0.19
	tree_trunk_mesh.height = 2.2
	tree_canopy_mesh = SphereMesh.new()
	tree_canopy_mesh.radius = 1.45
	tree_canopy_mesh.height = 2.5
	tree_canopy_mesh.radial_segments = 12
	tree_canopy_mesh.rings = 6
	tree_trunk_material = material(Color("5a402d"))
	tree_leaf_materials.clear()
	for leaf_hex in ["4e7d5c", "5c8d67", "6a9a5a"]:
		tree_leaf_materials.append(material(Color(String(leaf_hex))))

## Street/park tree whose "Canopy" pivot sits on the trunk top so it can sway in the wind.
func make_tree_node(node_name: String, pos: Vector3, scale_f: float, variant: int) -> Node3D:
	ensure_tree_resources()
	var tree := Node3D.new()
	tree.name = node_name
	tree.position = pos
	var trunk := MeshInstance3D.new()
	trunk.name = "Trunk"
	trunk.mesh = tree_trunk_mesh
	trunk.scale = Vector3.ONE * scale_f
	trunk.position = Vector3(0.0, 1.1 * scale_f, 0.0)
	trunk.material_override = tree_trunk_material
	tree.add_child(trunk)
	var canopy := Node3D.new()
	canopy.name = "Canopy"
	canopy.position = Vector3(0.0, 2.0 * scale_f, 0.0)
	var lower := MeshInstance3D.new()
	lower.name = "CanopyLower"
	lower.mesh = tree_canopy_mesh
	lower.scale = Vector3(1.0, 0.9, 1.0) * scale_f
	lower.position = Vector3(0.0, 0.85 * scale_f, 0.0)
	lower.material_override = tree_leaf_materials[posmod(variant, tree_leaf_materials.size())]
	canopy.add_child(lower)
	var upper := MeshInstance3D.new()
	upper.name = "CanopyUpper"
	upper.mesh = tree_canopy_mesh
	upper.scale = Vector3.ONE * (0.66 * scale_f)
	upper.position = Vector3(0.28, 1.75, -0.18) * scale_f
	upper.material_override = tree_leaf_materials[posmod(variant + 1, tree_leaf_materials.size())]
	canopy.add_child(upper)
	tree.add_child(canopy)
	park_tree_canopies.append(canopy)
	return tree

func is_point_in_boeddeker_park(pt: Vector2) -> bool:
	return Geometry2D.is_point_in_polygon(pt, PackedVector2Array(BOEDDEKER_PARK_RING))

func boeddeker_edge_clearance(pt: Vector2) -> float:
	var best := INF
	var n := BOEDDEKER_PARK_RING.size()
	for i in range(n):
		best = minf(best, dist_to_segment_2d(pt, BOEDDEKER_PARK_RING[i], BOEDDEKER_PARK_RING[(i + 1) % n]))
	return best

func boeddeker_path_distance(pt: Vector2) -> float:
	var best := INF
	for i in range(BOEDDEKER_PATH_POINTS.size() - 1):
		best = minf(best, dist_to_segment_2d(pt, BOEDDEKER_PATH_POINTS[i], BOEDDEKER_PATH_POINTS[i + 1]))
	return best

## Boeddeker Park (240 Eddy St at Jones): OSM outline lawn with a picket fence, Eddy St gate,
## winding path, shade trees, benches and a play structure. Furnishings are stylized, not surveyed.
func build_boeddeker_park() -> void:
	boeddeker_tree_points.clear()
	boeddeker_park_node = Node3D.new()
	boeddeker_park_node.name = "BoeddekerPark"
	var ring := PackedVector2Array(BOEDDEKER_PARK_RING)
	var tris := Geometry2D.triangulate_polygon(ring)
	var lawn_st := SurfaceTool.new()
	lawn_st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for i in range(0, tris.size(), 3):
		for k in range(3):
			var lp: Vector2 = ring[tris[i + k]]
			lawn_st.add_vertex(Vector3(lp.x, 0.02, lp.y))
	lawn_st.generate_normals()
	var lawn := MeshInstance3D.new()
	lawn.name = "ParkLawn"
	lawn.mesh = lawn_st.commit()
	lawn.material_override = material(Color("5b8f55"))
	boeddeker_park_node.add_child(lawn)
	var furn_st := SurfaceTool.new()
	furn_st.begin(Mesh.PRIMITIVE_TRIANGLES)
	furn_st.set_smooth_group(-1)
	var path_col := Color("cdbf9b")
	for i in range(BOEDDEKER_PATH_POINTS.size() - 1):
		var pa := BOEDDEKER_PATH_POINTS[i]
		var pb := BOEDDEKER_PATH_POINTS[i + 1]
		var pt := (pb - pa).normalized()
		var pn := Vector2(-pt.y, pt.x) * 1.2
		colored_quad(furn_st, Vector3(pa.x - pn.x, 0.035, pa.y - pn.y), Vector3(pb.x - pn.x, 0.035, pb.y - pn.y), Vector3(pb.x + pn.x, 0.035, pb.y + pn.y), Vector3(pa.x + pn.x, 0.035, pa.y + pn.y), path_col)
	for jp in BOEDDEKER_PATH_POINTS:
		colored_prism(furn_st, Vector3(jp.x, 0.03, jp.y), 1.2, 1.2, 0.008, 10, path_col, path_col)
	# Iron picket fence with top/bottom rails, open at the Eddy Street gate
	var iron := Color("2b3a33")
	var n_ring := ring.size()
	for i in range(n_ring):
		var fa: Vector2 = ring[i]
		var fb: Vector2 = ring[(i + 1) % n_ring]
		var f_len := fa.distance_to(fb)
		if f_len < 0.05:
			continue
		var pickets := maxi(1, int(f_len / 0.5))
		var run_start := -1
		for k in range(pickets + 1):
			var fp := fa.lerp(fb, float(k) / float(pickets))
			var at_gate := fp.distance_to(BOEDDEKER_PARK_ENTRANCE) < 2.8
			if not at_gate:
				colored_beam(furn_st, Vector3(fp.x, 0.0, fp.y), Vector3(fp.x, 1.15, fp.y), 0.05, iron)
				if run_start < 0:
					run_start = k
			if (at_gate or k == pickets) and run_start >= 0:
				var end_k := k - 1 if at_gate else k
				if end_k > run_start:
					var ra := fa.lerp(fb, float(run_start) / float(pickets))
					var rb := fa.lerp(fb, float(end_k) / float(pickets))
					for rail_y in [0.14, 1.1]:
						colored_beam(furn_st, Vector3(ra.x, float(rail_y), ra.y), Vector3(rb.x, float(rail_y), rb.y), 0.06, iron)
				run_start = -1
	# Gate arch over the Eddy Street entrance
	var gate_dir := (BOEDDEKER_PARK_RING[6] - BOEDDEKER_PARK_RING[5]).normalized()
	var gate_l := BOEDDEKER_PARK_ENTRANCE - gate_dir * 2.6
	var gate_r := BOEDDEKER_PARK_ENTRANCE + gate_dir * 2.6
	for gp in [gate_l, gate_r]:
		colored_prism(furn_st, Vector3(gp.x, 0.0, gp.y), 0.16, 0.14, 2.9, 8, iron, iron.lightened(0.2))
	colored_beam(furn_st, Vector3(gate_l.x, 2.8, gate_l.y), Vector3(gate_r.x, 2.8, gate_r.y), 0.16, Color("3f6b52"))
	# Benches facing the path
	var bench_wood := Color("8a6544")
	for b_i in range(1, BOEDDEKER_PATH_POINTS.size() - 1):
		var bp := BOEDDEKER_PATH_POINTS[b_i]
		var bt := (BOEDDEKER_PATH_POINTS[b_i + 1] - BOEDDEKER_PATH_POINTS[b_i - 1]).normalized()
		var bn := Vector2(-bt.y, bt.x)
		var bc := bp + bn * 2.3
		if not is_point_in_boeddeker_park(bc) or boeddeker_edge_clearance(bc) < 1.2:
			bc = bp - bn * 2.3
		if not is_point_in_boeddeker_park(bc) or boeddeker_edge_clearance(bc) < 1.2:
			continue
		colored_box(furn_st, Vector3(bc.x, 0.45, bc.y), Vector3(0.95, 0.05, 0.24), bt, bench_wood, bench_wood.lightened(0.12))
		var back := bc + (bc - bp).normalized() * 0.24
		colored_box(furn_st, Vector3(back.x, 0.78, back.y), Vector3(0.95, 0.22, 0.04), bt, bench_wood.darkened(0.08), bench_wood)
		for leg_s in [-0.8, 0.8]:
			var lg := bc + bt * float(leg_s)
			colored_box(furn_st, Vector3(lg.x, 0.2, lg.y), Vector3(0.05, 0.2, 0.2), bt, iron, iron)
	# Children's play structure in the western lawn
	var play_c := Vector2(-146.0, -112.0)
	if is_point_in_boeddeker_park(play_c) and boeddeker_edge_clearance(play_c) >= 3.0:
		colored_box(furn_st, Vector3(play_c.x, 0.012, play_c.y), Vector3(3.4, 0.012, 3.0), Vector2.RIGHT, Color("b46a4f"), Color("b46a4f"))
		for sx in [-1.0, 1.0]:
			for sz in [-1.0, 1.0]:
				colored_beam(furn_st, Vector3(play_c.x + sx * 1.1, 0.0, play_c.y + sz * 1.1), Vector3(play_c.x + sx * 1.1, 2.6, play_c.y + sz * 1.1), 0.12, Color("2f6e8e"))
		colored_box(furn_st, Vector3(play_c.x, 1.25, play_c.y), Vector3(1.25, 0.08, 1.25), Vector2.RIGHT, Color("e2b33f"), Color("efc55a"))
		colored_prism(furn_st, Vector3(play_c.x, 2.6, play_c.y), 1.7, 0.0, 0.9, 4, Color("d9573f"), Color(0, 0, 0, 0))
		colored_beam(furn_st, Vector3(play_c.x + 1.25, 1.25, play_c.y), Vector3(play_c.x + 3.2, 0.15, play_c.y), 0.5, Color("d9573f"))
	furn_st.generate_normals()
	var furn := MeshInstance3D.new()
	furn.name = "ParkFurnishings"
	furn.mesh = furn_st.commit()
	furn.material_override = vertex_color_material()
	boeddeker_park_node.add_child(furn)
	# Shade trees on a jittered 6.5 m grid clear of fence, path, play area and footprints
	var p_rect := Rect2(BOEDDEKER_PARK_RING[0], Vector2.ZERO)
	for rp in BOEDDEKER_PARK_RING:
		p_rect = p_rect.expand(rp)
	var trees_root := Node3D.new()
	trees_root.name = "ParkTrees"
	var gx := p_rect.position.x + 3.0
	while gx < p_rect.end.x and boeddeker_tree_points.size() < 24:
		var gz := p_rect.position.y + 3.0
		while gz < p_rect.end.y and boeddeker_tree_points.size() < 24:
			var jitter_seed := absi(("park:%d:%d" % [int(gx), int(gz)]).hash())
			var tp := Vector2(gx + float(jitter_seed % 21) / 10.0 - 1.0, gz + float((jitter_seed / 21) % 21) / 10.0 - 1.0)
			gz += 6.5
			if not is_point_in_boeddeker_park(tp) or boeddeker_edge_clearance(tp) < 2.6:
				continue
			if boeddeker_path_distance(tp) < 2.6 or tp.distance_to(play_c) < 5.2:
				continue
			if building_containing_point(tp) != "" or min_wall_distance(tp, 2.5) < 2.5:
				continue
			var t_scale := 1.4 + float(jitter_seed % 6) * 0.1
			trees_root.add_child(make_tree_node("ParkTree_%d" % boeddeker_tree_points.size(), Vector3(tp.x, 0.0, tp.y), t_scale, jitter_seed))
			boeddeker_tree_points.append(tp)
		gx += 6.5
	boeddeker_park_node.add_child(trees_root)
	var lbl := make_label_3d("BoeddekerParkLabel", "Boeddeker Park · 240 Eddy St", Vector3(BOEDDEKER_PARK_ENTRANCE.x, 3.6, BOEDDEKER_PARK_ENTRANCE.y), Color("c9f5c4"), 0.0125, 24)
	boeddeker_park_node.add_child(lbl)
	add_child(boeddeker_park_node)

func inspect_boeddeker_park() -> bool:
	in_overview = false
	in_wide_overview = false
	following_player = false
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
		selected = -1
	target = BOEDDEKER_VIEW_TARGET
	view_size = 96.0
	frame_landmark_view()
	if not boeddeker_park_visited:
		boeddeker_park_visited = true
		trigger_progress_cue("boeddeker_park", "Boeddeker Park")
	refresh_landmark_guidance()
	var line := "Boeddeker Park — 240 Eddy St at Jones (OpenStreetMap way %d)" % BOEDDEKER_PARK_OSM_WAY
	var sub := "Fenced neighborhood park: lawn, %d shade trees, play structure & benches along a winding path · Outline © OpenStreetMap / ODbL; trees, path & furniture are stylized, not surveyed" % boeddeker_tree_points.size()
	if info != null:
		info.text = "%s\n%s\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [line, sub]
	announce_a11y_status("%s: %s" % [line, sub])
	return true

# --- Living streetscape: speech bubbles, light pools, day/evening, tree sway, eatery counters ---

func speech_bubble_material(col: Color, priority: int) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	m.billboard_keep_scale = true
	m.no_depth_test = true
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	m.albedo_color = col
	m.render_priority = priority
	return m

## One floating billboard Label3D speech bubble shared by every speaker; it is rescaled from the
## orthographic camera size each frame so it keeps a readable on-screen size at any zoom.
func ensure_speech_bubble() -> void:
	if speech_bubble_node != null:
		return
	speech_bubble_root = Node3D.new()
	speech_bubble_root.name = "SpeechBubbles"
	add_child(speech_bubble_root)
	speech_bubble_node = Node3D.new()
	speech_bubble_node.name = "SpeechBubble"
	speech_bubble_node.visible = false
	speech_bubble_border = MeshInstance3D.new()
	speech_bubble_border.name = "SpeechBubbleBorder"
	speech_bubble_border.material_override = speech_bubble_material(Color(0.11, 0.23, 0.25, 0.95), 10)
	speech_bubble_node.add_child(speech_bubble_border)
	speech_bubble_bg = MeshInstance3D.new()
	speech_bubble_bg.name = "SpeechBubbleBackground"
	speech_bubble_bg.material_override = speech_bubble_material(Color(1.0, 0.973, 0.91, 0.97), 11)
	speech_bubble_node.add_child(speech_bubble_bg)
	speech_bubble_label = Label3D.new()
	speech_bubble_label.name = "SpeechBubbleText"
	speech_bubble_label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	speech_bubble_label.no_depth_test = true
	speech_bubble_label.render_priority = 12
	speech_bubble_label.pixel_size = SPEECH_BUBBLE_PIXEL
	speech_bubble_label.font_size = SPEECH_BUBBLE_FONT
	speech_bubble_label.outline_size = 0
	speech_bubble_label.modulate = Color("1d2b2f")
	speech_bubble_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	speech_bubble_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	speech_bubble_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	speech_bubble_node.add_child(speech_bubble_label)
	speech_bubble_root.add_child(speech_bubble_node)

## Chamfered bubble with a downward tail whose tip is the node origin; units are label pixels.
## `shift` slides the box sideways (tail stays put) to keep the bubble on screen.
func bubble_shape_mesh(w: float, h: float, tail_h: float, grow: float, shift: float = 0.0) -> ArrayMesh:
	var px := SPEECH_BUBBLE_PIXEL
	var x0 := shift - w * 0.5 - grow
	var x1 := shift + w * 0.5 + grow
	var y0 := tail_h - grow
	var y1 := tail_h + h + grow
	var c := minf(10.0, h * 0.3) + grow * 0.5
	var outline: Array[Vector2] = [Vector2(x0 + c, y0), Vector2(x1 - c, y0), Vector2(x1, y0 + c), Vector2(x1, y1 - c), Vector2(x1 - c, y1), Vector2(x0 + c, y1), Vector2(x0, y1 - c), Vector2(x0, y0 + c)]
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var center := Vector3(0.0, (y0 + y1) * 0.5, 0.0) * px
	for i in range(outline.size()):
		var p0 := outline[i]
		var p1 := outline[(i + 1) % outline.size()]
		st.add_vertex(center)
		st.add_vertex(Vector3(p0.x, p0.y, 0.0) * px)
		st.add_vertex(Vector3(p1.x, p1.y, 0.0) * px)
	var tw := 11.0 + grow
	st.add_vertex(Vector3(-tw, y0 + 1.0, 0.0) * px)
	st.add_vertex(Vector3(tw, y0 + 1.0, 0.0) * px)
	st.add_vertex(Vector3(0.0, -grow * 1.4, 0.0) * px)
	return st.commit()

func bubble_viewport_size() -> Vector2:
	if get_viewport() != null:
		return get_viewport().get_visible_rect().size
	return Vector2(1100.0, 760.0)

## Screen pixels per label pixel: ~18 px text on a 760 px-tall window, ~16 px on phones.
func speech_bubble_screen_scale() -> float:
	return clampf(bubble_viewport_size().y / 900.0, 0.68, 0.84)

## Node scale that maps one label pixel to speech_bubble_screen_scale() screen pixels.
func speech_bubble_base_scale() -> float:
	if camera == null:
		return 1.0
	var vp_h := maxf(bubble_viewport_size().y, 1.0)
	return speech_bubble_screen_scale() * camera.size / (vp_h * SPEECH_BUBBLE_PIXEL)

func speech_bubble_width_px() -> float:
	# Include padding and border when fitting a phone, without reducing the font.
	return clampf((play_area_rect().size.x - 12.0) / speech_bubble_screen_scale() - 34.0, 120.0, 440.0)

func refresh_speech_bubble_wrap() -> void:
	var width_px := speech_bubble_width_px()
	if is_equal_approx(speech_bubble_label.width, width_px) and speech_bubble_label.text == speech_bubble_text:
		return
	var font: Font = speech_bubble_label.font if speech_bubble_label.font != null else ThemeDB.fallback_font
	var text_size := font.get_multiline_string_size(speech_bubble_text, HORIZONTAL_ALIGNMENT_CENTER, width_px, SPEECH_BUBBLE_FONT)
	speech_bubble_box = Vector3(minf(width_px, text_size.x) + 28.0, text_size.y + 12.0, 10.0)
	speech_bubble_label.width = width_px
	speech_bubble_label.text = speech_bubble_text
	apply_speech_bubble_shape(0.0)

## Bounds of the actual billboard, including its border, tail and animated scale.
func speech_bubble_screen_rect() -> Rect2:
	if not is_speech_bubble_visible() or camera == null:
		return Rect2()
	var anchor := camera.unproject_position(speech_bubble_node.global_position)
	var s := SPEECH_BUBBLE_PIXEL * speech_bubble_node.scale.y / screen_constant_scale(1.0)
	return Rect2(anchor + Vector2(speech_bubble_shift - speech_bubble_box.x * 0.5 - 3.0, -speech_bubble_box.z - speech_bubble_box.y - 3.0) * s, Vector2(speech_bubble_box.x + 6.0, speech_bubble_box.y + speech_bubble_box.z + 7.2) * s)

func apply_speech_bubble_shape(shift: float) -> void:
	speech_bubble_shift = shift
	speech_bubble_label.offset = Vector2(shift, speech_bubble_box.z + speech_bubble_box.y * 0.5)
	speech_bubble_bg.mesh = bubble_shape_mesh(speech_bubble_box.x, speech_bubble_box.y, speech_bubble_box.z, 0.0, shift)
	speech_bubble_border.mesh = bubble_shape_mesh(speech_bubble_box.x, speech_bubble_box.y, speech_bubble_box.z, 3.0, shift)

## 'Bea: "Welcome..."' -> 'Welcome...' (the nameplate already says who is talking).
func spoken_text_from_line(line: String) -> String:
	var quote_at := line.find(": \"")
	if quote_at >= 0 and quote_at <= 12 and line.ends_with("\"") and line.length() > quote_at + 4:
		return line.substr(quote_at + 3, line.length() - quote_at - 4)
	return line

func show_speech_bubble(anchor_id: String, world_pos: Vector3, text: String, hold_sec: float = -1.0) -> void:
	hide_speech_bubble()
	ensure_speech_bubble()
	var body := text.strip_edges()
	if body.is_empty():
		hide_speech_bubble()
		return
	speech_bubble_text = body
	refresh_speech_bubble_wrap()
	speech_bubble_anchor = anchor_id
	speech_bubble_anchor_pos = world_pos
	apply_speech_bubble_shape(0.0)
	speech_bubble_node.position = world_pos
	speech_bubble_node.scale = Vector3.ONE * (0.6 * speech_bubble_base_scale())
	speech_bubble_node.visible = true
	speech_bubble_age = 0.0
	speech_bubble_deferred = false
	speech_bubble_in_info = false
	speech_bubble_timer = hold_sec if hold_sec > 0.0 else clampf(4.5 + float(body.length()) * 0.055, 6.0, 14.0)

func show_neighbor_speech(index: int, line: String) -> void:
	if index < 0 or index >= neighbors.size():
		return
	var n_pos: Vector3 = neighbors[index].pos
	show_speech_bubble(String(neighbors[index].get("id", "")), n_pos + Vector3.UP * SPEECH_BUBBLE_HEIGHT_M, spoken_text_from_line(line))

func release_speech_info() -> void:
	if speech_opened_info:
		speech_opened_info = false
		set_header_details(false, false)

func hide_speech_bubble() -> void:
	if speech_bubble_node != null:
		speech_bubble_node.visible = false
	speech_bubble_anchor = ""
	speech_bubble_timer = 0.0
	speech_bubble_deferred = false
	speech_bubble_in_info = false
	speech_bubble_in_activity = false
	speech_bubble_activity_matched = false
	release_speech_info()

func is_speech_bubble_visible() -> bool:
	return speech_bubble_node != null and speech_bubble_node.visible

func speech_activity_detail() -> RichTextLabel:
	var details: Array = [mural_detail_label, music_stem_label]
	if uses_compact_activity_controls() and block_panel != null and block_panel.visible and block_panel_mode == "talk":
		details.append(block_detail_label)
	for detail in details:
		if detail != null and detail.is_visible_in_tree() and not speech_bubble_text.is_empty() and detail.text.contains(speech_bubble_text):
			return detail
	return null

func announce_speech_location(location: String) -> void:
	var notice := "Full dialogue in %s." % location
	var spoken := speech_bubble_text.replace("\n", " ").strip_edges()
	# Keep the earned-progress context when this same line was just announced.
	if last_a11y_announcement.contains(spoken):
		if not last_a11y_announcement.ends_with(notice):
			announce_a11y_status(last_a11y_announcement + " " + notice)
	else:
		announce_a11y_status(notice + " " + spoken)

func update_speech_bubble(delta: float) -> void:
	if speech_bubble_node == null or speech_bubble_anchor.is_empty():
		return
	if speech_bubble_in_info and not header_details_expanded:
		hide_speech_bubble() # Explicitly closing Info dismisses its dialogue.
		return
	var activity_detail := speech_activity_detail()
	if speech_bubble_activity_matched and activity_detail == null:
		# New activity instructions supersede a line already available there.
		hide_speech_bubble()
		return
	speech_bubble_activity_matched = speech_bubble_activity_matched or activity_detail != null
	var anchor_xz := Vector2(speech_bubble_anchor_pos.x, speech_bubble_anchor_pos.z)
	if in_overview or in_wide_overview or Vector2(target.x, target.z).distance_to(anchor_xz) > SPEECH_BUBBLE_HIDE_TARGET_DIST_M:
		hide_speech_bubble()
		return
	refresh_speech_bubble_wrap()
	var pop := clampf((speech_bubble_age + delta) / 0.2, 0.0, 1.0)
	speech_bubble_node.scale = Vector3.ONE * ((0.6 + 0.4 * (1.0 - pow(1.0 - pop, 3.0))) * speech_bubble_base_scale())
	speech_bubble_node.position = speech_bubble_anchor_pos + Vector3.UP * (sin(speech_bubble_age * 2.1) * 0.06)
	speech_bubble_node.visible = true
	var area := play_area_rect().grow(-2.0)
	var banner_visible := reward_banner != null and reward_banner.is_visible_in_tree()
	var reward_rect := reward_banner.get_global_rect().grow(3.0) if banner_visible else Rect2()
	# Reserve full size from the start: never pop in briefly then disappear.
	var full_size := Vector2(speech_bubble_box.x + 6.0, speech_bubble_box.y + speech_bubble_box.z + 7.2) * speech_bubble_screen_scale()
	var full_position := camera.unproject_position(speech_bubble_node.global_position) + Vector2(speech_bubble_shift - speech_bubble_box.x * 0.5 - 3.0, -speech_bubble_box.z - speech_bubble_box.y - 3.0) * speech_bubble_screen_scale()
	var fitted := fit_overlay_around_player(Rect2(full_position, full_size), area, reward_rect)
	speech_bubble_deferred = not fitted.has_area()
	var was_in_activity := speech_bubble_in_activity
	speech_bubble_in_activity = speech_bubble_deferred and not speech_bubble_in_info and speech_activity_detail() != null
	if speech_bubble_deferred:
		speech_bubble_node.visible = false
		if speech_bubble_in_activity:
			# The same complete dialogue is already in this scrollable activity.
			# Avoid expanding another panel over the character just to repeat it.
			if not was_in_activity:
				announce_speech_location("the conversation panel" if speech_activity_detail() == block_detail_label else "the activity instructions")
		elif banner_visible:
			return # Its complete reading time starts when the reward has cleared.
		elif not speech_bubble_in_info and info != null:
			speech_bubble_in_info = true
			var reward_prefix := reward_info_prefix if reward_banner_timer > 0.0 and info.text.begins_with(reward_info_prefix) else ""
			info.text = reward_prefix + speech_bubble_text + "\n\n" + info.text.trim_prefix(reward_prefix)
			var was_collapsed := not header_details_expanded
			set_header_details(true, false)
			speech_opened_info = was_collapsed
			announce_speech_location("Info")
	else:
		var shift := fitted.position - full_position
		speech_bubble_node.position += (camera.global_basis.x * shift.x - camera.global_basis.y * shift.y) * screen_constant_scale(1.0)
		speech_bubble_age += delta
	speech_bubble_timer -= delta
	if speech_bubble_timer <= 0.0:
		hide_speech_bubble()

func add_light_pool(st: SurfaceTool, center: Vector2, axis_t: Vector2, half_a: float, half_b: float, col: Color, peak_alpha: float) -> void:
	var t := axis_t.normalized() if axis_t.length_squared() > 1e-8 else Vector2.RIGHT
	var n := Vector2(-t.y, t.x)
	var segs := 16
	var y := 0.045
	var c3 := Vector3(center.x, y, center.y)
	var inner := Color(col.r, col.g, col.b, peak_alpha)
	var mid := Color(col.r, col.g, col.b, peak_alpha * 0.45)
	var rim := Color(col.r, col.g, col.b, 0.0)
	for s in range(segs):
		var a0 := TAU * float(s) / float(segs)
		var a1 := TAU * float(s + 1) / float(segs)
		var e0 := center + t * (cos(a0) * half_a) + n * (sin(a0) * half_b)
		var e1 := center + t * (cos(a1) * half_a) + n * (sin(a1) * half_b)
		var m0 := center.lerp(e0, 0.55)
		var m1 := center.lerp(e1, 0.55)
		st.set_color(inner)
		st.add_vertex(c3)
		st.set_color(mid)
		st.add_vertex(Vector3(m0.x, y, m0.y))
		st.set_color(mid)
		st.add_vertex(Vector3(m1.x, y, m1.y))
		st.set_color(mid)
		st.add_vertex(Vector3(m0.x, y, m0.y))
		st.set_color(rim)
		st.add_vertex(Vector3(e0.x, y, e0.y))
		st.set_color(rim)
		st.add_vertex(Vector3(e1.x, y, e1.y))
		st.set_color(mid)
		st.add_vertex(Vector3(m0.x, y, m0.y))
		st.set_color(rim)
		st.add_vertex(Vector3(e1.x, y, e1.y))
		st.set_color(mid)
		st.add_vertex(Vector3(m1.x, y, m1.y))

## Additive warm light pools spilling from street-facing ground-floor storefront windows and
## from the sidewalk globe lamps; faint by day, glowing in evening mode (Shift+L).
func build_light_pools() -> void:
	light_pool_centers.clear()
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for spot in storefront_light_spots:
		var mid: Vector2 = spot.mid
		var nrm: Vector2 = spot.normal
		if nrm.length_squared() < 1e-6:
			continue
		nrm = nrm.normalized()
		var c := mid + nrm * 1.7
		if building_containing_point(c) != "":
			nrm = -nrm
			c = mid + nrm * 1.7
			if building_containing_point(c) != "":
				continue
		var sd := min_street_distance(c)
		if sd < 5.0 or sd > 11.0:
			continue
		var dup := false
		for p in light_pool_centers:
			if p.distance_to(c) < 2.2:
				dup = true
				break
		if dup:
			continue
		var glow: Color = spot.glow
		var tint := Color(1.0, 0.82, 0.5) if glow.r > 0.8 else Color(0.62, 0.9, 0.92)
		add_light_pool(st, c, Vector2(-nrm.y, nrm.x), clampf(float(spot.half_len), 1.3, 4.6), 1.7, tint, 0.55)
		light_pool_centers.append(c)
	for lp in street_lamp_points:
		add_light_pool(st, lp, Vector2.RIGHT, 3.3, 3.3, Color(1.0, 0.86, 0.58), 0.5)
		light_pool_centers.append(lp)
	var pools := MeshInstance3D.new()
	pools.name = "StorefrontLightPools"
	pools.mesh = st.commit()
	light_pool_material = StandardMaterial3D.new()
	light_pool_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	light_pool_material.vertex_color_use_as_albedo = true
	light_pool_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	light_pool_material.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	light_pool_material.cull_mode = BaseMaterial3D.CULL_DISABLED
	light_pool_material.albedo_color = Color(1.0, 1.0, 1.0, DAY_LIGHT_POOL_ALPHA)
	pools.material_override = light_pool_material
	add_child(pools)

func apply_time_of_day() -> void:
	if world_env != null:
		world_env.background_color = Color("0d1822") if evening_mode else Color("172a2e")
		world_env.ambient_light_color = Color("b9c2dc") if evening_mode else Color("f2ead8")
		world_env.ambient_light_energy = 0.48 if evening_mode else 0.72
	if sun_light != null:
		sun_light.light_color = Color("ffb27a") if evening_mode else Color.WHITE
		sun_light.light_energy = 0.42 if evening_mode else 1.25
	if rim_light != null:
		rim_light.light_color = Color("ff9f6e") if evening_mode else Color("ffd8a6")
		rim_light.light_energy = 0.30 if evening_mode else 0.48
	if light_pool_material != null:
		light_pool_material.albedo_color = Color(1.0, 1.0, 1.0, 1.0 if evening_mode else DAY_LIGHT_POOL_ALPHA)
	if building_shader_material != null:
		building_shader_material.set_shader_parameter("night_glow", 1.0 if evening_mode else 0.0)

func toggle_evening_lights() -> bool:
	evening_mode = not evening_mode
	apply_time_of_day()
	var msg := "Evening on Turk Street: storefront windows and street lamps pool warm light across the sidewalks." if evening_mode else "Daylight over the Tenderloin: the storefront light pools fade back."
	if info != null:
		info.text = "%s\nShift+L toggles day / evening · %d stylized storefront & lamp light pools\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [msg, light_pool_centers.size()]
	announce_a11y_status(msg)
	return evening_mode


func street_tree_canopy_xforms(i: int, rx: float, rz: float) -> Array[Transform3D]:
	var s := street_tree_scales[i]
	var base := Transform3D(Basis.from_euler(Vector3(rx, street_tree_yaws[i], rz)), street_tree_pivots[i])
	var lower := base * Transform3D(Basis.from_scale(Vector3(1.0, 0.9, 1.0) * s), Vector3(0.0, 0.85 * s, 0.0))
	var upper := base * Transform3D(Basis.from_scale(Vector3.ONE * (0.66 * s)), Vector3(0.28, 1.75, -0.18) * s)
	return [lower, upper]

## Real street trees from the San Francisco Street Tree Inventory (DataSF tkzw-k3nq, PDDL 1.0),
## derived offline by scripts/build-street-trees.mjs into data/street_trees.json: one tree per
## city record, sized by trunk diameter and tinted by species. Visual only; they don't block walking.
func load_street_tree_data() -> void:
	street_tree_points.clear()
	street_tree_pivots.clear()
	street_tree_scales.clear()
	street_tree_yaws.clear()
	street_tree_ids.clear()
	street_tree_species.clear()
	street_tree_source = {}
	var raw := FileAccess.get_file_as_string(STREET_TREE_DATA_PATH)
	var parsed: Variant = JSON.parse_string(raw) if not raw.is_empty() else null
	if not parsed is Dictionary:
		push_warning("Missing data/street_trees.json; run node scripts/build-street-trees.mjs.")
		return
	street_tree_source = parsed.get("source", {})
	for t in parsed.get("trees", []):
		if not t is Dictionary:
			continue
		var c := Vector2(float(t.get("x", 0.0)), float(t.get("z", 0.0)))
		var dbh := float(t.get("dbh_in", 0))
		var sc := clampf(0.85 + dbh * 0.035, 0.85, 1.9) if dbh > 0.0 else 1.1
		var t_id := String(t.get("id", ""))
		street_tree_points.append(c)
		street_tree_scales.append(sc)
		street_tree_pivots.append(Vector3(c.x, 2.0 * sc, c.y))
		street_tree_yaws.append(float(absi(t_id.hash()) % 628) / 100.0)
		street_tree_ids.append(t_id)
		street_tree_species.append(String(t.get("species", "")))

func street_tree_leaf_color(species: String, i: int) -> Color:
	var sp := species.to_lower()
	if sp.contains("london plane") or sp.contains("sycamore"):
		return Color("6a9a5a")
	if sp.contains("brisbane box"):
		return Color("4e7d5c")
	if sp.contains("xmas") or sp.contains("christmas"):
		return Color("3f6e4a")
	if sp.contains("ficus") or sp.contains("laurel fig"):
		return Color("3d6b45")
	if sp.contains("pear"):
		return Color("7aa36a")
	if sp.contains("ash"):
		return Color("6f9a60")
	var fallback: Array[Color] = [Color("5c8d67"), Color("587f4c"), Color("668f58")]
	return fallback[i % fallback.size()]

func build_street_trees() -> void:
	ensure_tree_resources()
	if street_tree_points.is_empty():
		load_street_tree_data()
	var count := street_tree_points.size()
	var trees_root := Node3D.new()
	trees_root.name = "StreetTrees"
	var trunk_mm := MultiMesh.new()
	trunk_mm.transform_format = MultiMesh.TRANSFORM_3D
	trunk_mm.mesh = tree_trunk_mesh
	trunk_mm.instance_count = count
	street_tree_lower_mm = MultiMesh.new()
	street_tree_lower_mm.transform_format = MultiMesh.TRANSFORM_3D
	street_tree_lower_mm.use_colors = true
	street_tree_lower_mm.mesh = tree_canopy_mesh
	street_tree_lower_mm.instance_count = count
	street_tree_upper_mm = MultiMesh.new()
	street_tree_upper_mm.transform_format = MultiMesh.TRANSFORM_3D
	street_tree_upper_mm.use_colors = true
	street_tree_upper_mm.mesh = tree_canopy_mesh
	street_tree_upper_mm.instance_count = count
	for i in range(count):
		var sc := street_tree_scales[i]
		var pv := street_tree_pivots[i]
		trunk_mm.set_instance_transform(i, Transform3D(Basis.from_scale(Vector3.ONE * sc), Vector3(pv.x, 1.1 * sc, pv.z)))
		var leaf := street_tree_leaf_color(street_tree_species[i] if i < street_tree_species.size() else "", i)
		street_tree_lower_mm.set_instance_color(i, leaf)
		street_tree_upper_mm.set_instance_color(i, leaf.lightened(0.07))
		var xf := street_tree_canopy_xforms(i, 0.0, 0.0)
		street_tree_lower_mm.set_instance_transform(i, xf[0])
		street_tree_upper_mm.set_instance_transform(i, xf[1])
	var canopy_mat := vertex_color_material()
	for mm_item in [["StreetTreeTrunks", trunk_mm, tree_trunk_material], ["StreetTreeCanopyLower", street_tree_lower_mm, canopy_mat], ["StreetTreeCanopyUpper", street_tree_upper_mm, canopy_mat]]:
		var mmi := MultiMeshInstance3D.new()
		mmi.name = String(mm_item[0])
		mmi.multimesh = mm_item[1]
		mmi.material_override = mm_item[2]
		trees_root.add_child(mmi)
	add_child(trees_root)

func update_tree_sway(delta: float) -> void:
	wind_clock = wrapf(wind_clock + delta, 0.0, 3600.0)
	var gust := 0.75 + 0.25 * sin(wind_clock * 0.37)
	for i in range(park_tree_canopies.size()):
		var cn := park_tree_canopies[i]
		if cn == null:
			continue
		var ph := float(i) * 1.37
		cn.rotation = Vector3(sin(wind_clock * 1.30 + ph) * 0.035 * gust, cn.rotation.y, sin(wind_clock * 0.95 + ph * 1.7) * 0.045 * gust)
	for p_i in range(planter_canopy_nodes.size()):
		var pc := planter_canopy_nodes[p_i]
		if pc == null:
			continue
		var pph := float(p_i) * 2.1
		pc.position = planter_canopy_base[p_i] + Vector3(sin(wind_clock * 1.2 + pph) * 0.06 * gust, 0.0, cos(wind_clock * 0.9 + pph) * 0.05 * gust)
	if street_tree_lower_mm != null and street_tree_upper_mm != null:
		for t_i in range(street_tree_points.size()):
			var tph := float(t_i) * 0.83
			var sway_rx := sin(wind_clock * 1.25 + tph) * 0.035 * gust
			var sway_rz := sin(wind_clock * 0.9 + tph * 1.6) * 0.045 * gust
			if t_i == 0:
				street_tree_sway_sample = Vector2(sway_rx, sway_rz)
			var xf := street_tree_canopy_xforms(t_i, sway_rx, sway_rz)
			street_tree_lower_mm.set_instance_transform(t_i, xf[0])
			street_tree_upper_mm.set_instance_transform(t_i, xf[1])

func nearest_street_point(pt: Vector2) -> Vector2:
	var best := INF
	var best_pt := pt
	for w_idx in range(street_ways.size()):
		if rect_distance_2d(street_way_rects[w_idx], pt) >= best:
			continue
		var pts: Array = street_ways[w_idx].points
		for i in range(1, pts.size()):
			var va := Vector2(pts[i - 1][0], pts[i - 1][1])
			var vb := Vector2(pts[i][0], pts[i][1])
			var ab := vb - va
			var denom := ab.length_squared()
			var t := 0.0 if denom < 1e-12 else clampf((pt - va).dot(ab) / denom, 0.0, 1.0)
			var q := va + ab * t
			var d := pt.distance_to(q)
			if d < best:
				best = d
				best_pt = q
	return best_pt

## Sidewalk counter site 6.6 m from the street centerline in front of an eatery, nudged along the
## curb to stay clear of walls, neighbors, and the mural/speaker props.
func eatery_counter_site(e_pos: Vector3) -> Dictionary:
	var e2 := Vector2(e_pos.x, e_pos.z)
	var sp := nearest_street_point(e2)
	var away := e2 - sp
	if away.length_squared() < 1e-6:
		away = Vector2(0.0, 1.0)
	away = away.normalized()
	var tangent := Vector2(-away.y, away.x)
	var avoid: Array[Vector2] = [mural_xz(), speaker_xz()]
	for n in neighbors:
		var np: Vector3 = n.pos
		avoid.append(Vector2(np.x, np.z))
	for shift in [0.0, 3.0, -3.0, 5.5, -5.5, 8.0, -8.0]:
		var c: Vector2 = sp + away * 6.6 + tangent * float(shift)
		if building_containing_point(c) != "" or min_wall_distance(c, 1.7) < 1.7:
			continue
		var clash := false
		for av in avoid:
			if av.distance_to(c) < 2.8:
				clash = true
				break
		if not clash:
			return {"center": c, "toward_street": -away}
	return {"center": sp + away * 6.6, "toward_street": -away}

func add_prop_mesh(parent: Node3D, mesh: Mesh, pos: Vector3, mat: Material, node_name: String = "") -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	if not node_name.is_empty():
		mi.name = node_name
	mi.mesh = mesh
	mi.position = pos
	mi.material_override = mat
	parent.add_child(mi)
	return mi

func prop_cylinder(r_top: float, r_bottom: float, h: float) -> CylinderMesh:
	var m := CylinderMesh.new()
	m.top_radius = r_top
	m.bottom_radius = r_bottom
	m.height = h
	m.radial_segments = 14
	m.rings = 1
	return m

func prop_box(size: Vector3) -> BoxMesh:
	var m := BoxMesh.new()
	m.size = size
	return m

func prop_sphere(r: float) -> SphereMesh:
	var m := SphereMesh.new()
	m.radius = r
	m.height = r * 2.0
	m.radial_segments = 10
	m.rings = 5
	return m

func prop_prism(size: Vector3) -> PrismMesh:
	var m := PrismMesh.new()
	m.size = size
	return m

func add_steam_puffs(props: Node3D, e_idx: int, base: Vector3, count: int) -> void:
	var steam_mat := translucent_material(Color(1.0, 1.0, 1.0, 0.42))
	steam_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	for k in range(count):
		var puff := add_prop_mesh(props, prop_sphere(0.075), base + Vector3(float(k - 1) * 0.06, 0.0, 0.0), steam_mat, "Steam_%d" % k)
		eatery_anim_parts.append({"idx": e_idx, "kind": "steam", "node": puff, "base": puff.position, "phase": float(k) / float(maxi(1, count))})

## Signature items on each counter top; steam rises, records spin, neon flickers while visited.
func add_counter_items(props: Node3D, e_idx: int, e_id: String) -> void:
	var y0 := 1.165
	match e_id:
		"bowl_basil_pho":
			add_prop_mesh(props, prop_cylinder(0.24, 0.13, 0.16), Vector3(-0.35, y0 + 0.08, 0.05), material(Color("efe6d2")), "PhoBowl")
			add_prop_mesh(props, prop_cylinder(0.215, 0.215, 0.02), Vector3(-0.35, y0 + 0.155, 0.05), mural_material(Color("d58a3a")), "PhoBroth")
			add_prop_mesh(props, prop_box(Vector3(0.30, 0.05, 0.16)), Vector3(0.45, y0 + 0.025, 0.0), material(Color("c98d3d")), "ImperialRolls")
			add_steam_puffs(props, e_idx, Vector3(-0.35, y0 + 0.26, 0.05), 3)
		"saffron_clay_oven":
			add_prop_mesh(props, prop_box(Vector3(0.36, 0.10, 0.26)), Vector3(-0.32, y0 + 0.05, 0.0), material(Color("8b5a2b")), "NaanBasket")
			var naan := add_prop_mesh(props, prop_sphere(0.16), Vector3(-0.32, y0 + 0.13, 0.0), material(Color("e8c58a")), "GarlicNaan")
			naan.scale = Vector3(1.0, 0.22, 0.7)
			add_prop_mesh(props, prop_cylinder(0.14, 0.09, 0.08), Vector3(0.08, y0 + 0.04, 0.08), material(Color("b5532b")), "ChanaMasala")
			add_prop_mesh(props, prop_cylinder(0.06, 0.05, 0.20), Vector3(0.45, y0 + 0.10, 0.05), mural_material(Color("f2a541")), "MangoLassi")
			add_steam_puffs(props, e_idx, Vector3(0.08, y0 + 0.16, 0.08), 2)
		"blue_valve_hifi":
			add_prop_mesh(props, prop_box(Vector3(0.46, 0.08, 0.36)), Vector3(0.0, y0 + 0.04, 0.0), material(Color("3a2f2a")), "Turntable")
			var platter := add_prop_mesh(props, prop_cylinder(0.15, 0.15, 0.015), Vector3(0.0, y0 + 0.087, 0.0), material(Color("141414")), "VinylRecord")
			add_prop_mesh(platter, prop_cylinder(0.05, 0.05, 0.017), Vector3(0.04, 0.0, 0.0), material(Color("c0392b")), "RecordLabel")
			eatery_anim_parts.append({"idx": e_idx, "kind": "spin", "node": platter, "base": platter.position, "phase": 0.0})
			for sx in [-0.95, 0.95]:
				add_prop_mesh(props, prop_box(Vector3(0.20, 0.38, 0.18)), Vector3(float(sx), y0 + 0.19, -0.05), material(Color("2b2b2b")), "HiFiSpeaker")
			for tx in [0.26, 0.34]:
				var tube := add_prop_mesh(props, prop_cylinder(0.025, 0.025, 0.07), Vector3(float(tx), y0 + 0.12, -0.12), mural_material(Color("ff9e5e")), "AmpTube")
				eatery_anim_parts.append({"idx": e_idx, "kind": "flicker", "node": tube, "base": tube.position, "phase": float(tx) * 9.0})
		"morning_star_banh_mi":
			add_prop_mesh(props, prop_cylinder(0.2, 0.2, 0.02), Vector3(-0.25, y0 + 0.01, 0.05), material(Color("f4f1ea")), "Plate")
			var bread := CapsuleMesh.new()
			bread.radius = 0.055
			bread.height = 0.44
			var baguette := add_prop_mesh(props, bread, Vector3(-0.25, y0 + 0.07, 0.05), material(Color("d9a253")), "BanhMi")
			baguette.rotation_degrees = Vector3(0.0, 0.0, 90.0)
			add_prop_mesh(props, prop_box(Vector3(0.34, 0.02, 0.05)), Vector3(-0.25, y0 + 0.115, 0.05), material(Color("6aa84f")), "PickledFilling")
			add_prop_mesh(props, prop_cylinder(0.06, 0.05, 0.18), Vector3(0.40, y0 + 0.09, 0.05), material(Color("a8744a")), "IcedCoffee")
			add_prop_mesh(props, prop_cylinder(0.008, 0.008, 0.12), Vector3(0.42, y0 + 0.22, 0.05), material(Color("e74c3c")), "Straw")
		"copper_cue_tavern":
			add_prop_mesh(props, prop_cylinder(0.06, 0.05, 0.20), Vector3(-0.40, y0 + 0.10, 0.08), material(Color("e0a83a")), "DraftGlass")
			add_prop_mesh(props, prop_cylinder(0.062, 0.062, 0.03), Vector3(-0.40, y0 + 0.215, 0.08), material(Color("fbf6e9")), "Foam")
			var ball_cols: Array[Color] = [Color("f4d03f"), Color("c0392b"), Color("1f3a93")]
			for b_i in range(3):
				add_prop_mesh(props, prop_sphere(0.05), Vector3(0.18 + float(b_i) * 0.11, y0 + 0.05, 0.05), material(ball_cols[b_i]), "BilliardBall_%d" % b_i)
			for ex in [-0.12, 0.12]:
				var eye := add_prop_mesh(props, prop_sphere(0.09), Vector3(float(ex), 2.42, -0.98), mural_material(Color("f5c2ff")), "NeonCueBall")
				eatery_anim_parts.append({"idx": e_idx, "kind": "flicker", "node": eye, "base": eye.position, "phase": 1.7})
		"open_seat_diner":
			add_prop_mesh(props, prop_cylinder(0.03, 0.03, 0.10), Vector3(-0.30, y0 + 0.05, 0.0), material(Color("b9b2a3")), "PieStandPost")
			add_prop_mesh(props, prop_cylinder(0.20, 0.20, 0.02), Vector3(-0.30, y0 + 0.11, 0.0), material(Color("d8d0c0")), "PieStand")
			add_prop_mesh(props, prop_cylinder(0.16, 0.16, 0.06), Vector3(-0.30, y0 + 0.15, 0.0), material(Color("b5476b")), "OlallieberryPie")
			var dome := add_prop_mesh(props, prop_sphere(0.21), Vector3(-0.30, y0 + 0.15, 0.0), translucent_material(Color(0.87, 0.95, 0.96, 0.32)), "PieDome")
			dome.scale = Vector3(1.0, 0.8, 1.0)
			add_prop_mesh(props, prop_cylinder(0.05, 0.05, 0.09), Vector3(0.40, y0 + 0.045, 0.08), material(Color("f4efe6")), "CoffeeMug")
			add_steam_puffs(props, e_idx, Vector3(0.40, y0 + 0.14, 0.08), 2)

func build_eatery_counters() -> void:
	eatery_counter_nodes.clear()
	eatery_host_nodes.clear()
	eatery_counter_points.clear()
	eatery_anim_parts.clear()
	var counters_root := Node3D.new()
	counters_root.name = "EateryCounters"
	var host_skins: Array[Color] = [Color("c38c65"), Color("8b5b3f"), Color("704b37"), Color("b67f5d"), Color("966345"), Color("a97650")]
	var host_hair: Array[Color] = [Color("2a2623"), Color("383c32"), Color("1e2224"), Color("454236"), Color("dad7c6"), Color("3f352c")]
	for e_idx in range(NEIGHBORHOOD_EATERIES.size()):
		var e_rec: Dictionary = NEIGHBORHOOD_EATERIES[e_idx]
		var e_id := String(e_rec.get("id", ""))
		var site := eatery_counter_site(e_rec.get("pos", Vector3.ZERO))
		var c2: Vector2 = site.center
		var toward: Vector2 = site.toward_street
		var canopy_col := Color(String(e_rec.get("canopy_color", "d97736")))
		var props := Node3D.new()
		props.name = "CounterProps_%s" % e_id
		props.position = Vector3(c2.x, 0.0, c2.y)
		props.rotation.y = atan2(toward.x, toward.y)
		props.scale = Vector3.ONE * 1.4
		props.visible = false
		var st := SurfaceTool.new()
		st.begin(Mesh.PRIMITIVE_TRIANGLES)
		st.set_smooth_group(-1)
		var no_cap := Color(0, 0, 0, 0)
		colored_box(st, Vector3(0.0, 0.55, 0.0), Vector3(1.3, 0.55, 0.32), Vector2.RIGHT, Color("6e4b33"), Color("7d5a40"))
		colored_box(st, Vector3(0.0, 1.13, 0.02), Vector3(1.42, 0.035, 0.4), Vector2.RIGHT, canopy_col.lightened(0.25), canopy_col.lightened(0.4))
		colored_box(st, Vector3(0.0, 0.35, 0.33), Vector3(1.3, 0.12, 0.012), Vector2.RIGHT, canopy_col, canopy_col)
		for sx in [-0.8, 0.0, 0.8]:
			colored_prism(st, Vector3(float(sx), 0.0, 0.8), 0.05, 0.04, 0.7, 6, Color("2d3532"), no_cap)
			colored_prism(st, Vector3(float(sx), 0.7, 0.8), 0.2, 0.2, 0.07, 10, canopy_col.lightened(0.1), canopy_col.lightened(0.25))
		for mx in [-0.95, 0.95]:
			colored_beam(st, Vector3(float(mx), 0.0, -1.05), Vector3(float(mx), 2.55, -1.05), 0.07, Color("2d3532"))
		colored_box(st, Vector3(0.0, 2.15, -1.05), Vector3(1.05, 0.4, 0.04), Vector2.RIGHT, Color("203238"), Color("203238"))
		st.generate_normals()
		var body := MeshInstance3D.new()
		body.name = "CounterBody"
		body.mesh = st.commit()
		body.material_override = vertex_color_material()
		props.add_child(body)
		var items: Array = EATERY_MENU_ITEMS.get(e_id, ["house special"])
		var menu_lbl := make_label_3d("CounterMenuLabel", "Today: %s" % String(items[0]), Vector3(0.0, 2.15, -0.98), Color(String(e_rec.get("label_color", "ffd899"))), 0.0085, 22)
		menu_lbl.set_meta("eatery_index", e_idx)
		menu_lbl.outline_size = 8
		props.add_child(menu_lbl)
		var host := make_person_node("CounterHost", canopy_col.lightened(0.15), host_skins[e_idx % host_skins.size()], host_hair[e_idx % host_hair.size()], 1.70, false)
		host.position = Vector3(0.0, 0.0, -0.75)
		host.scale = Vector3(1.55, 1.55, 1.55)
		props.add_child(host)
		add_counter_items(props, e_idx, e_id)
		counters_root.add_child(props)
		eatery_counter_nodes.append(props)
		eatery_host_nodes.append(host)
		eatery_counter_points.append(c2)
	add_child(counters_root)

func show_eatery_host_speech(idx: int, line: String) -> void:
	if idx < 0 or idx >= eatery_counter_nodes.size():
		return
	var props := eatery_counter_nodes[idx]
	var host_world := props.position + props.basis * Vector3(0.0, 0.0, -0.75)
	var rec: Dictionary = NEIGHBORHOOD_EATERIES[idx]
	show_speech_bubble("eatery:%s" % String(rec.get("id", "")), host_world + Vector3.UP * SPEECH_BUBBLE_HEIGHT_M, "%s (fictional)\n%s" % [String(rec.get("name", "")), line])

func eatery_counter_interact(target_idx: int = -1) -> bool:
	var idx := eatery_guide_idx if target_idx < 0 else target_idx
	if idx < 0 or idx >= NEIGHBORHOOD_EATERIES.size() or idx >= eatery_counter_nodes.size():
		return false
	if idx != eatery_guide_idx:
		cycle_eatery_guide(idx)
	var rec: Dictionary = NEIGHBORHOOD_EATERIES[idx]
	var e_id := String(rec.get("id", ""))
	var count := int(eatery_order_counts.get(e_id, 0)) + 1
	eatery_order_counts[e_id] = count
	var lines: Array = EATERY_HOST_LINES.get(e_id, ["Welcome in!"])
	var items: Array = EATERY_MENU_ITEMS.get(e_id, ["house special"])
	var line := String(lines[count % lines.size()])
	var item := String(items[(count - 1) % items.size()])
	show_eatery_host_speech(idx, line)
	if count == 1:
		var e_pos: Vector3 = rec.get("pos", Vector3.ZERO)
		trigger_progress_cue("eatery_order", e_id)
		trigger_feel_good_burst("Order Up: %s" % item.capitalize(), "%s · Sparks: %d" % [String(rec.get("name", "")), spark_count()], e_pos + Vector3.UP * 2.2, Color(String(rec.get("label_color", "ffe8a3"))))
	var msg := "Ordering at %s: %s (tap the counter again for more)" % [String(rec.get("name", "")), item]
	refresh_landmark_guidance()
	if info != null:
		info.text = "%s\nHost: \"%s\"\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [msg, line]
	announce_a11y_status("%s. Host says: %s" % [msg, line])
	return true

func surprise_sidewalk_site(raw_pos: Vector3) -> Dictionary:
	var raw_xz := Vector2(raw_pos.x, raw_pos.z)
	var sp := nearest_street_point(raw_xz)
	var away := raw_xz - sp
	if away.length_squared() < 1e-6:
		away = Vector2(0.0, 1.0)
	away = away.normalized()
	var tangent := Vector2(-away.y, away.x)
	var avoid: Array[Vector2] = [mural_xz(), speaker_xz(), comptons_xz(), blackhawk_xz(), Vector2(PLAYER_START.x, PLAYER_START.z)]
	for n in neighbors:
		var np: Vector3 = n.pos
		avoid.append(Vector2(np.x, np.z))
	for c_pt in eatery_counter_points:
		avoid.append(c_pt)
	for s_existing in surprise_points.values():
		avoid.append(s_existing)
	for shift in [0.0, 2.5, -2.5, 5.0, -5.0, 7.5, -7.5, 10.0, -10.0]:
		for dist_from_street in [6.2, 5.6, 6.8]:
			var cand: Vector2 = sp + away * float(dist_from_street) + tangent * float(shift)
			if building_containing_point(cand) != "" or min_wall_distance(cand, 1.4) < 1.4:
				continue
			var clash := false
			for av in avoid:
				if av.distance_to(cand) < 2.6:
					clash = true
					break
			if not clash:
				return {"center": cand, "toward_street": -away}
	var safe_fb := nearest_walkable_point(raw_xz, WALK_CLEARANCE_M)
	return {"center": safe_fb, "toward_street": -away}

func build_neighborhood_surprises() -> void:
	surprise_nodes.clear()
	surprise_beacon_meshes.clear()
	surprise_points.clear()
	drag_performer_nodes.clear()
	viking_biker_node = null
	viking_bike_mesh = null
	surprise_vinyl_mesh = null
	cutesy_dino_node = null
	cutesy_dino_tail_node = null
	magic_carpet_chef_node = null
	magic_carpet_chef_person = null
	clown_horn_walker_node = null
	clown_horn_bulb_mesh = null
	mayor_event_speaker_node = null
	mayor_fanfare_bugler_node = null
	mayor_scissors_node = null
	surprise_root = Node3D.new()
	surprise_root.name = "NeighborhoodSurprises"
	for s_id in NEIGHBORHOOD_SURPRISE_IDS:
		var rec: Dictionary = NEIGHBORHOOD_SURPRISES.get(s_id, {})
		var site := surprise_sidewalk_site(rec.get("pos", Vector3.ZERO))
		var c2: Vector2 = site.center
		var toward: Vector2 = site.toward_street
		var accent := Color(String(rec.get("accent", "f8cc58")))
		var s_node := Node3D.new()
		s_node.name = "Surprise_%s" % s_id
		s_node.position = Vector3(c2.x, 0.0, c2.y)
		s_node.rotation.y = atan2(toward.x, toward.y)
		if s_id == "jeffrey_record":
			var crate := add_prop_mesh(s_node, prop_box(Vector3(0.68, 0.44, 0.52)), Vector3(0.0, 0.22, 0.0), material(Color("8a5a36")), "RecordCrate")
			crate.rotation.y = 0.18
			var sleeve := add_prop_mesh(s_node, prop_box(Vector3(0.54, 0.54, 0.05)), Vector3(-0.08, 0.54, -0.06), mural_material(Color("2b6e8c")), "AlbumJacket")
			sleeve.rotation_degrees = Vector3(-12.0, 10.0, 0.0)
			surprise_vinyl_mesh = add_prop_mesh(s_node, prop_cylinder(0.26, 0.26, 0.02), Vector3(0.12, 0.58, 0.10), material(Color("151719")), "LostVinylLP")
			surprise_vinyl_mesh.rotation_degrees = Vector3(72.0, 0.0, 0.0)
			add_prop_mesh(surprise_vinyl_mesh, prop_cylinder(0.09, 0.09, 0.024), Vector3.ZERO, mural_material(Color("f8cc58")), "GoldCenterLabel")
			s_node.add_child(make_label_3d("SurpriseLabel", "[*] Jeffrey's Lost 1961 Record (Tap / Shift+D)", Vector3(0.0, 2.35, 0.0), Color("ffe699"), 0.0105, 22))
		elif s_id == "hidden_mural_145":
			add_prop_mesh(s_node, prop_box(Vector3(1.86, 1.56, 0.14)), Vector3(0.0, 1.18, -0.10), material(Color("3a2b28")), "HiddenMuralFrame")
			add_prop_mesh(s_node, prop_box(Vector3(1.68, 1.38, 0.16)), Vector3(0.0, 1.18, -0.08), mural_material(Color("5d2c3e")), "HiddenMuralCanvas")
			var sun_m := add_prop_mesh(s_node, prop_cylinder(0.24, 0.24, 0.06), Vector3(-0.48, 1.32, 0.02), mural_material(Color("f8cc58")), "AlcoveSunDisc")
			sun_m.rotation_degrees = Vector3(90.0, 0.0, 0.0)
			for w_i in range(3):
				add_prop_mesh(s_node, prop_box(Vector3(0.42, 0.09, 0.06)), Vector3(0.0, 1.02 + float(w_i) * 0.16, 0.03), mural_material(Color("5fd4ba") if w_i != 1 else Color("9ef5e5")), "AlcoveWaveBar_%d" % w_i)
			for r_i in range(3):
				var sh := 0.22 + float(r_i) * 0.14
				add_prop_mesh(s_node, prop_box(Vector3(0.12, sh, 0.06)), Vector3(0.36 + float(r_i) * 0.14, 0.90 + sh * 0.5, 0.03), mural_material(Color("ee835c") if r_i < 2 else Color("ffb585")), "AlcoveRiseStep_%d" % r_i)
			var horn_m := add_prop_mesh(s_node, prop_cylinder(0.14, 0.04, 0.34), Vector3(-0.44, 0.92, 0.04), mural_material(Color("f5d57a")), "AlcoveJazzHorn")
			horn_m.rotation_degrees = Vector3(0.0, 0.0, -55.0)
			s_node.add_child(make_label_3d("SurpriseLabel", "[*] 145 Leavenworth Hidden Mural (Tap / Shift+D)", Vector3(0.0, 2.55, 0.0), Color("9ef5e5"), 0.0105, 22))
		elif s_id == "impromptu_drag_show":
			add_prop_mesh(s_node, prop_box(Vector3(2.80, 0.10, 1.45)), Vector3(0.0, 0.05, 0.0), mural_material(Color("b83b7d")), "VelvetRunway")
			add_prop_mesh(s_node, prop_box(Vector3(2.88, 0.04, 1.52)), Vector3(0.0, 0.02, 0.0), mural_material(Color("f8cc58")), "GoldRunwayTrim")
			for l_i in range(3):
				add_prop_mesh(s_node, prop_sphere(0.11), Vector3(-0.95 + float(l_i) * 0.95, 0.14, 0.68), mural_material(Color("ffe394") if l_i != 1 else Color("5fd4ba")), "Footlight_%d" % l_i)
			var queen_a := make_person_node("DragStarlight", Color("e0539c"), Color("8d5b3e"), Color("f5d57a"), 1.76, false)
			queen_a.position = Vector3(-0.62, 0.10, -0.08)
			queen_a.scale = Vector3(1.85, 1.85, 1.85)
			add_prop_mesh(queen_a, prop_cylinder(0.14, 0.11, 0.18), Vector3(0.0, 1.84, 0.0), mural_material(Color("ffe394")), "StarlightCrown")
			s_node.add_child(queen_a)
			drag_performer_nodes.append(queen_a)
			var queen_b := make_person_node("DragVelvet", Color("4ecdc4"), Color("b9825f"), Color("f5a3d0"), 1.74, false)
			queen_b.position = Vector3(0.62, 0.10, -0.08)
			queen_b.scale = Vector3(1.85, 1.85, 1.85)
			add_prop_mesh(queen_b, prop_cylinder(0.13, 0.10, 0.16), Vector3(0.0, 1.82, 0.0), mural_material(Color("f5a3d0")), "VelvetTiara")
			s_node.add_child(queen_b)
			drag_performer_nodes.append(queen_b)
			s_node.add_child(make_label_3d("SurpriseLabel", "[*] Impromptu Drag Show! (Tap / Shift+D)", Vector3(0.0, 3.85, 0.0), Color("f5c2ff"), 0.011, 23))
		elif s_id == "viking_dirt_biker":
			var bike_root := Node3D.new()
			bike_root.name = "DirtBike"
			for wheel_x in [-0.68, 0.68]:
				var w_name := "RearTire" if wheel_x < 0.0 else "FrontTire"
				var tire := add_prop_mesh(bike_root, prop_cylinder(0.38, 0.38, 0.16), Vector3(float(wheel_x), 0.38, 0.0), material(Color("1e2224")), w_name)
				tire.rotation_degrees = Vector3(90.0, 0.0, 0.0)
				var hub := add_prop_mesh(bike_root, prop_cylinder(0.16, 0.16, 0.18), Vector3(float(wheel_x), 0.38, 0.0), mural_material(Color("d8d4c8")), "%sHub" % w_name)
				hub.rotation_degrees = Vector3(90.0, 0.0, 0.0)
			add_prop_mesh(bike_root, prop_box(Vector3(0.52, 0.32, 0.24)), Vector3(-0.04, 0.48, 0.0), material(Color("3b4245")), "EngineBlock")
			var frame_bar := add_prop_mesh(bike_root, prop_box(Vector3(1.12, 0.18, 0.22)), Vector3(0.0, 0.74, 0.0), mural_material(Color("e87a2e")), "DirtBikeFrame")
			frame_bar.rotation_degrees = Vector3(0.0, 0.0, 8.0)
			var fender := add_prop_mesh(bike_root, prop_box(Vector3(0.46, 0.06, 0.20)), Vector3(0.58, 0.76, 0.0), mural_material(Color("ffb35c")), "FrontFender")
			fender.rotation_degrees = Vector3(0.0, 0.0, -14.0)
			for fork_z in [-0.11, 0.11]:
				var fork := add_prop_mesh(bike_root, prop_cylinder(0.035, 0.035, 0.78), Vector3(0.54, 0.68, float(fork_z)), material(Color("c8c4b8")), "FrontFork_%s" % ("L" if fork_z < 0.0 else "R"))
				fork.rotation_degrees = Vector3(0.0, 0.0, -20.0)
			var hbar := add_prop_mesh(bike_root, prop_cylinder(0.03, 0.03, 0.72), Vector3(0.38, 1.06, 0.0), material(Color("2b3033")), "Handlebar")
			hbar.rotation_degrees = Vector3(90.0, 0.0, 0.0)
			var pipe := add_prop_mesh(bike_root, prop_cylinder(0.045, 0.035, 0.56), Vector3(-0.48, 0.64, 0.15), material(Color("9ea4a8")), "ExhaustPipe")
			pipe.rotation_degrees = Vector3(0.0, 0.0, 72.0)
			s_node.add_child(bike_root)
			viking_bike_mesh = bike_root
			var rider := make_person_node("VikingBiker", Color("7a4e2d"), Color("c38c65"), Color("3a2e25"), 1.72, false)
			rider.position = Vector3(-0.06, 0.18, 0.0)
			rider.rotation.y = PI * 0.5
			rider.scale = Vector3(1.85, 1.85, 1.85)
			var helmet := Node3D.new()
			helmet.name = "VikingHelmet"
			helmet.position = Vector3(0.0, 1.66, 0.0)
			add_prop_mesh(helmet, prop_sphere(0.16), Vector3(0.0, 0.04, 0.0), mural_material(Color("8c969e")), "HelmetDome")
			add_prop_mesh(helmet, prop_cylinder(0.165, 0.165, 0.05), Vector3(0.0, 0.0, 0.0), mural_material(Color("d6a848")), "HelmetBrowBand")
			add_prop_mesh(helmet, prop_box(Vector3(0.035, 0.11, 0.04)), Vector3(0.0, -0.04, 0.15), material(Color("8c969e")), "NoseGuard")
			for horn_side in [-1.0, 1.0]:
				var h_name := "LeftHorn" if horn_side < 0.0 else "RightHorn"
				var horn_pivot := Node3D.new()
				horn_pivot.name = h_name
				horn_pivot.position = Vector3(horn_side * 0.15, 0.04, 0.0)
				horn_pivot.rotation_degrees = Vector3(12.0, 0.0, -horn_side * 52.0)
				add_prop_mesh(horn_pivot, prop_cylinder(0.032, 0.058, 0.22), Vector3(0.0, 0.10, 0.0), mural_material(Color("f4ebd0")), "HornBase")
				var tip := add_prop_mesh(horn_pivot, prop_cylinder(0.008, 0.032, 0.18), Vector3(-horn_side * 0.05, 0.25, 0.02), mural_material(Color("ffe394")), "HornTip")
				tip.rotation_degrees = Vector3(0.0, 0.0, horn_side * 34.0)
				helmet.add_child(horn_pivot)
			rider.add_child(helmet)
			s_node.add_child(rider)
			viking_biker_node = rider
			s_node.add_child(make_label_3d("SurpriseLabel", "[*] Dirt Biker in a Viking Helmet (Tap / Shift+D)", Vector3(0.0, 3.85, 0.0), Color("ffd27d"), 0.011, 23))
		elif s_id == "cutesy_dino":
			var dino_root := Node3D.new()
			dino_root.name = "CutesyDino"
			dino_root.scale = Vector3(1.35, 1.35, 1.35)
			var body_m := add_prop_mesh(dino_root, prop_sphere(0.42), Vector3(0.0, 0.54, 0.0), mural_material(Color("7ce8b0")), "DinoBody")
			body_m.scale = Vector3(0.95, 0.88, 1.22)
			var belly_m := add_prop_mesh(dino_root, prop_sphere(0.31), Vector3(0.0, 0.50, 0.16), mural_material(Color("fff3b8")), "DinoBelly")
			belly_m.scale = Vector3(0.82, 0.78, 0.92)
			var head_m := add_prop_mesh(dino_root, prop_sphere(0.35), Vector3(0.0, 1.02, 0.30), mural_material(Color("7ce8b0")), "DinoHead")
			head_m.scale = Vector3(1.02, 0.94, 1.12)
			for side_s in [-1.0, 1.0]:
				var side_tag := "L" if side_s < 0.0 else "R"
				add_prop_mesh(dino_root, prop_sphere(0.068), Vector3(side_s * 0.16, 1.10, 0.58), material(Color("182026")), "DinoEye_%s" % side_tag)
				add_prop_mesh(dino_root, prop_sphere(0.026), Vector3(side_s * 0.14, 1.13, 0.63), mural_material(Color("ffffff")), "DinoEyeSparkle_%s" % side_tag)
				add_prop_mesh(dino_root, prop_sphere(0.075), Vector3(side_s * 0.25, 0.98, 0.52), mural_material(Color("ff8fa3")), "DinoCheekBlush_%s" % side_tag)
				var arm := add_prop_mesh(dino_root, prop_cylinder(0.055, 0.068, 0.24), Vector3(side_s * 0.34, 0.68, 0.26), mural_material(Color("7ce8b0")), "DinoStubArm_%s" % side_tag)
				arm.rotation_degrees = Vector3(42.0, 0.0, -side_s * 36.0)
				add_prop_mesh(dino_root, prop_box(Vector3(0.20, 0.16, 0.28)), Vector3(side_s * 0.20, 0.08, 0.08), mural_material(Color("62d198")), "DinoFoot_%s" % side_tag)
			var tail_pivot := Node3D.new()
			tail_pivot.name = "DinoTailPivot"
			tail_pivot.position = Vector3(0.0, 0.44, -0.38)
			var tail_m := add_prop_mesh(tail_pivot, prop_cylinder(0.05, 0.20, 0.56), Vector3(0.0, 0.06, -0.24), mural_material(Color("7ce8b0")), "DinoTail")
			tail_m.rotation_degrees = Vector3(68.0, 0.0, 0.0)
			dino_root.add_child(tail_pivot)
			cutesy_dino_tail_node = tail_pivot
			var plate_pos: Array[Vector3] = [
				Vector3(0.0, 1.34, 0.22),
				Vector3(0.0, 1.14, -0.04),
				Vector3(0.0, 0.88, -0.30),
				Vector3(0.0, 0.66, -0.54)
			]
			for p_i in range(plate_pos.size()):
				var pl_col := Color("ff8fa3") if (p_i % 2 == 0) else Color("ffd45e")
				var pl := add_prop_mesh(dino_root, prop_box(Vector3(0.09, 0.18, 0.18)), plate_pos[p_i], mural_material(pl_col), "DinoBackPlate_%d" % p_i)
				pl.rotation_degrees = Vector3(28.0 + float(p_i) * 10.0, 0.0, 0.0)
			s_node.add_child(dino_root)
			cutesy_dino_node = dino_root
			s_node.add_child(make_label_3d("SurpriseLabel", "[*] Small Cutesy Dinosaur (Tap / Shift+D)", Vector3(0.0, 2.55, 0.0), Color("9ef5e5"), 0.011, 23))
		elif s_id == "magic_carpet_chef":
			var carpet_root := Node3D.new()
			carpet_root.name = "MagicCarpetRig"
			carpet_root.position = Vector3(0.0, 1.15, 0.0)
			add_prop_mesh(carpet_root, prop_box(Vector3(1.78, 0.06, 2.36)), Vector3(0.0, 0.0, 0.0), mural_material(Color("f8cc58")), "CarpetGoldTrim")
			add_prop_mesh(carpet_root, prop_box(Vector3(1.62, 0.08, 2.20)), Vector3(0.0, 0.02, 0.0), mural_material(Color("b8255f")), "CarpetCrimsonWeave")
			var medallion := add_prop_mesh(carpet_root, prop_cylinder(0.46, 0.46, 0.09), Vector3(0.0, 0.03, 0.0), mural_material(Color("5fd4ba")), "CarpetMedallion")
			medallion.scale = Vector3(1.0, 1.0, 1.35)
			for cx_s in [-1.0, 1.0]:
				for cz_s in [-1.0, 1.0]:
					var t_name := "Tassel_%s_%s" % [("L" if cx_s < 0.0 else "R"), ("F" if cz_s > 0.0 else "B")]
					add_prop_mesh(carpet_root, prop_cylinder(0.04, 0.08, 0.24), Vector3(cx_s * 0.88, -0.08, cz_s * 1.16), mural_material(Color("ffe394")), t_name)
			for sp_i in range(3):
				add_prop_mesh(carpet_root, prop_sphere(0.18 + float(sp_i) * 0.04), Vector3(-0.42 + float(sp_i) * 0.42, -0.26 - float(sp_i % 2) * 0.10, -0.25 + float(sp_i) * 0.25), mural_material(Color("ff9ec4") if sp_i != 1 else Color("ffe394")), "SpiceCloud_%d" % sp_i)
			var chef := make_person_node("ChefZafira", Color("d9385a"), Color("b97d56"), Color("7a1f45"), 1.74, false)
			chef.position = Vector3(0.0, 0.06, 0.0)
			chef.scale = Vector3(1.85, 1.85, 1.85)
			add_prop_mesh(chef, prop_box(Vector3(0.31, 0.56, 0.23)), Vector3(0.0, 0.92, 0.02), mural_material(Color("fff8eb")), "ChefApron")
			add_prop_mesh(chef, prop_cylinder(0.13, 0.12, 0.16), Vector3(0.0, 1.76, 0.0), mural_material(Color("fff8eb")), "ChefToqueBand")
			add_prop_mesh(chef, prop_sphere(0.19), Vector3(0.0, 1.94, 0.0), mural_material(Color("ffffff")), "ChefToquePuff")
			var wok := add_prop_mesh(chef, prop_cylinder(0.20, 0.11, 0.11), Vector3(-0.34, 1.18, 0.22), mural_material(Color("e07b39")), "FlamingCopperWok")
			wok.rotation_degrees = Vector3(18.0, 0.0, -16.0)
			add_prop_mesh(wok, prop_sphere(0.11), Vector3(0.0, 0.10, 0.0), mural_material(Color("ffd45e")), "WokSpiceFlame")
			var ladle := add_prop_mesh(chef, prop_cylinder(0.024, 0.024, 0.42), Vector3(0.32, 1.32, 0.20), mural_material(Color("f8cc58")), "GoldenSpiceLadle")
			ladle.rotation_degrees = Vector3(-28.0, 0.0, 24.0)
			carpet_root.add_child(chef)
			magic_carpet_chef_person = chef
			s_node.add_child(carpet_root)
			magic_carpet_chef_node = carpet_root
			s_node.add_child(make_label_3d("SurpriseLabel", "[*] Wild Woman Chef on a Magic Carpet (Tap / Shift+D)", Vector3(0.0, 4.95, 0.0), Color("ffb3d1"), 0.011, 23))
		elif s_id == "bite_size_nachos":
			add_prop_mesh(s_node, prop_box(Vector3(0.92, 0.48, 0.62)), Vector3(0.0, 0.24, 0.0), material(Color("a36a38")), "NachoSnackCrate")
			add_prop_mesh(s_node, prop_box(Vector3(0.96, 0.06, 0.66)), Vector3(0.0, 0.50, 0.0), mural_material(Color("ffd45e")), "NachoTrayCloth")
			for bag_i in range(4):
				var bx := -0.27 + float(bag_i) * 0.18
				var bz := -0.06 if (bag_i % 2 == 0) else 0.08
				var bag_col := Color("ff7b47") if (bag_i % 2 == 0) else Color("f8cc58")
				var bag := add_prop_mesh(s_node, prop_box(Vector3(0.14, 0.24, 0.10)), Vector3(bx, 0.64, bz), mural_material(bag_col), "MiniNachoBag_%d" % bag_i)
				bag.rotation_degrees = Vector3(0.0, float(bag_i - 1) * 12.0, 0.0)
				var chip := add_prop_mesh(s_node, prop_prism(Vector3(0.10, 0.09, 0.03)), Vector3(bx, 0.79, bz), mural_material(Color("ffe380")), "NachoChip_%d" % bag_i)
				chip.rotation_degrees = Vector3(14.0, float(bag_i) * 22.0, -10.0)
			for sc_i in range(2):
				var sx := -0.18 + float(sc_i) * 0.36
				add_prop_mesh(s_node, prop_cylinder(0.07, 0.055, 0.10), Vector3(sx, 0.58, 0.21), mural_material(Color("5fd4ba") if sc_i == 0 else Color("e8533f")), "SalsaCup_%d" % sc_i)
			s_node.add_child(make_label_3d("SurpriseLabel", "[*] Bite-Sized Bags of Nachos (Tap / Shift+D)", Vector3(0.0, 2.35, 0.0), Color("ffd45e"), 0.0105, 22))
		elif s_id == "good_donut_and_bagel":
			add_prop_mesh(s_node, prop_cylinder(0.46, 0.36, 0.76), Vector3(0.0, 0.38, 0.0), material(Color("8a5e3c")), "BakeryTreatStand")
			add_prop_mesh(s_node, prop_box(Vector3(0.84, 0.08, 0.58)), Vector3(0.0, 0.80, 0.0), mural_material(Color("ffd9e6")), "PastryBox")
			add_prop_mesh(s_node, prop_cylinder(0.20, 0.20, 0.09), Vector3(-0.21, 0.88, 0.02), mural_material(Color("d99b52")), "GoodDonutBase")
			add_prop_mesh(s_node, prop_cylinder(0.18, 0.19, 0.045), Vector3(-0.21, 0.92, 0.02), mural_material(Color("ff7eb3")), "DonutPinkGlaze")
			add_prop_mesh(s_node, prop_cylinder(0.055, 0.055, 0.06), Vector3(-0.21, 0.93, 0.02), material(Color("ffd9e6")), "DonutCenterHole")
			for sp_j in range(4):
				var ang_d := float(sp_j) * PI * 0.5 + 0.3
				add_prop_mesh(s_node, prop_box(Vector3(0.045, 0.018, 0.018)), Vector3(-0.21 + cos(ang_d) * 0.11, 0.95, 0.02 + sin(ang_d) * 0.11), mural_material(Color("ffe394") if sp_j % 2 == 0 else Color("5fd4ba")), "DonutSprinkle_%d" % sp_j)
			add_prop_mesh(s_node, prop_cylinder(0.20, 0.20, 0.095), Vector3(0.21, 0.88, -0.02), mural_material(Color("c9843e")), "GoodBagelBase")
			add_prop_mesh(s_node, prop_cylinder(0.17, 0.18, 0.035), Vector3(0.21, 0.92, -0.02), mural_material(Color("fff8eb")), "BagelCreamCheese")
			add_prop_mesh(s_node, prop_cylinder(0.05, 0.05, 0.06), Vector3(0.21, 0.93, -0.02), material(Color("ffd9e6")), "BagelCenterHole")
			for seed_i in range(4):
				var ang_b := float(seed_i) * PI * 0.5 + 0.7
				add_prop_mesh(s_node, prop_sphere(0.018), Vector3(0.21 + cos(ang_b) * 0.11, 0.95, -0.02 + sin(ang_b) * 0.11), material(Color("2b2623")), "EverythingSeed_%d" % seed_i)
			s_node.add_child(make_label_3d("SurpriseLabel", "[*] Good Donut & Everything Bagel (Tap / Shift+D)", Vector3(0.0, 2.35, 0.0), Color("ffb3d1"), 0.0105, 22))
		elif s_id == "clown_horn_walker":
			var honker := make_person_node("ClownHornWalker", Color("3b82c4"), Color("d49a72"), Color("d96b38"), 1.73, false)
			honker.scale = Vector3(1.85, 1.85, 1.85)
			var horn_rig := Node3D.new()
			horn_rig.name = "ClownHornProp"
			horn_rig.position = Vector3(0.28, 1.18, 0.24)
			var brass_cone := add_prop_mesh(horn_rig, prop_cylinder(0.095, 0.025, 0.34), Vector3(0.0, 0.0, 0.14), mural_material(Color("f8cc58")), "ClownHornBrass")
			brass_cone.rotation_degrees = Vector3(90.0, 0.0, 0.0)
			clown_horn_bulb_mesh = add_prop_mesh(horn_rig, prop_sphere(0.095), Vector3(0.0, 0.0, -0.05), mural_material(Color("ff3b47")), "ClownHornBulb")
			honker.add_child(horn_rig)
			s_node.add_child(honker)
			clown_horn_walker_node = honker
			s_node.add_child(make_label_3d("SurpriseLabel", "[*] Guy with a Clown Horn — Honk! (Tap / Shift+D)", Vector3(0.0, 3.85, 0.0), Color("ff9e9e"), 0.011, 23))
		elif s_id == "mayor_pomp_event":
			add_prop_mesh(s_node, prop_box(Vector3(2.90, 0.08, 1.65)), Vector3(0.0, 0.04, 0.0), mural_material(Color("9e1f32")), "CeremonialRedCarpet")
			add_prop_mesh(s_node, prop_box(Vector3(0.68, 1.12, 0.52)), Vector3(0.0, 0.56, 0.18), material(Color("243b61")), "MayoralPodium")
			add_prop_mesh(s_node, prop_box(Vector3(0.76, 0.08, 0.58)), Vector3(0.0, 1.14, 0.18), mural_material(Color("f8cc58")), "PodiumGoldTop")
			var seal := add_prop_mesh(s_node, prop_cylinder(0.18, 0.18, 0.04), Vector3(0.0, 0.76, 0.45), mural_material(Color("ffd45e")), "PodiumSeal")
			seal.rotation_degrees = Vector3(90.0, 0.0, 0.0)
			for st_side in [-1.15, 1.15]:
				var st_tag := "L" if st_side < 0.0 else "R"
				add_prop_mesh(s_node, prop_cylinder(0.045, 0.055, 0.92), Vector3(float(st_side), 0.46, 0.62), mural_material(Color("f8cc58")), "GoldStanchion_%s" % st_tag)
				add_prop_mesh(s_node, prop_sphere(0.085), Vector3(float(st_side), 0.96, 0.62), mural_material(Color("ffe394")), "StanchionFinial_%s" % st_tag)
			add_prop_mesh(s_node, prop_box(Vector3(2.30, 0.09, 0.03)), Vector3(0.0, 0.78, 0.62), mural_material(Color("e62e4d")), "CeremonialRibbon")
			var scissors_rig := Node3D.new()
			scissors_rig.name = "GiantGoldScissors"
			scissors_rig.position = Vector3(0.42, 0.88, 0.66)
			var blade_a := add_prop_mesh(scissors_rig, prop_box(Vector3(0.56, 0.055, 0.025)), Vector3(0.12, 0.03, 0.0), mural_material(Color("ffe394")), "ScissorBladeA")
			blade_a.rotation_degrees = Vector3(0.0, 0.0, 16.0)
			var blade_b := add_prop_mesh(scissors_rig, prop_box(Vector3(0.56, 0.055, 0.025)), Vector3(0.12, -0.03, 0.01), mural_material(Color("f8cc58")), "ScissorBladeB")
			blade_b.rotation_degrees = Vector3(0.0, 0.0, -16.0)
			add_prop_mesh(scissors_rig, prop_cylinder(0.09, 0.09, 0.03), Vector3(-0.18, 0.09, 0.0), mural_material(Color("ffd45e")), "ScissorHandleA")
			add_prop_mesh(scissors_rig, prop_cylinder(0.09, 0.09, 0.03), Vector3(-0.18, -0.09, 0.0), mural_material(Color("ffd45e")), "ScissorHandleB")
			s_node.add_child(scissors_rig)
			mayor_scissors_node = scissors_rig
			var mayor := make_person_node("BlockMayor", Color("26466d"), Color("c68b63"), Color("e8e4dc"), 1.75, false)
			mayor.position = Vector3(0.0, 0.08, -0.32)
			mayor.scale = Vector3(1.85, 1.85, 1.85)
			var sash := add_prop_mesh(mayor, prop_box(Vector3(0.34, 0.52, 0.23)), Vector3(0.0, 1.02, 0.0), mural_material(Color("ffd45e")), "MayoralSash")
			sash.rotation_degrees = Vector3(0.0, 0.0, 26.0)
			s_node.add_child(mayor)
			mayor_event_speaker_node = mayor
			var bugler := make_person_node("FanfareBugler", Color("8f2447"), Color("a8724d"), Color("f5d57a"), 1.72, false)
			bugler.position = Vector3(-0.88, 0.08, -0.18)
			bugler.scale = Vector3(1.80, 1.80, 1.80)
			var bugle := add_prop_mesh(bugler, prop_cylinder(0.10, 0.022, 0.46), Vector3(0.22, 1.42, 0.28), mural_material(Color("ffe394")), "PompTrumpet")
			bugle.rotation_degrees = Vector3(78.0, 0.0, 0.0)
			add_prop_mesh(bugle, prop_box(Vector3(0.02, 0.22, 0.24)), Vector3(0.0, 0.0, -0.14), mural_material(Color("5fd4ba")), "TrumpetBanner")
			s_node.add_child(bugler)
			mayor_fanfare_bugler_node = bugler
			s_node.add_child(make_label_3d("SurpriseLabel", "[*] Impromptu 'Mayor Public Event' (Tap / Shift+D)", Vector3(0.0, 3.95, 0.0), Color("ffe394"), 0.011, 23))
		var beacon := add_prop_mesh(s_node, prop_sphere(0.18), Vector3(0.0, 1.95, 0.0), material(Color("8a7964")), "SurpriseBeacon")
		surprise_nodes[s_id] = s_node
		surprise_beacon_meshes[s_id] = beacon
		surprise_points[s_id] = c2
		surprise_root.add_child(s_node)
	add_child(surprise_root)
	update_neighborhood_surprises_3d()

func update_neighborhood_surprises_3d() -> void:
	for s_id in NEIGHBORHOOD_SURPRISE_IDS:
		if not surprise_beacon_meshes.has(s_id):
			continue
		var beacon: MeshInstance3D = surprise_beacon_meshes[s_id]
		var rec: Dictionary = NEIGHBORHOOD_SURPRISES.get(s_id, {})
		var accent := Color(String(rec.get("accent", "f8cc58")))
		if discovered_surprises.has(s_id):
			beacon.material_override = mural_material(accent)
			beacon.scale = Vector3.ONE * 1.25
		else:
			beacon.material_override = mural_material(accent.darkened(0.28))
			beacon.scale = Vector3.ONE
	for k_id in surprise_keepsake_nodes.keys():
		var k_node: Node3D = surprise_keepsake_nodes[k_id]
		if k_node != null:
			k_node.visible = discovered_surprises.has(String(k_id))
	if not discovered_surprises.has("cutesy_dino"):
		if celeste_dino_figurine_node != null:
			celeste_dino_figurine_node.position.y = 0.88
		if celeste_dino_tail_node != null:
			celeste_dino_tail_node.rotation_degrees = Vector3(58.0, -35.0, 0.0)
	if not discovered_surprises.has("clown_horn_walker") and rook_clown_horn_bulb_mesh != null:
		rook_clown_horn_bulb_mesh.scale = Vector3.ONE
	if not discovered_surprises.has("magic_carpet_chef") and dez_carpet_keepsake_node != null:
		dez_carpet_keepsake_node.position.y = 0.14
		dez_carpet_keepsake_node.rotation.z = 0.0
	var has_jeffrey_lp := discovered_surprises.has("jeffrey_record")
	if speaker_beacon_mesh != null:
		speaker_beacon_mesh.position = Vector3(0.0, 1.54 if has_jeffrey_lp else 1.30, -0.06 if has_jeffrey_lp else 0.0)

func visible_surprise_keepsake_count() -> int:
	var count := 0
	for s_id in NEIGHBORHOOD_SURPRISE_IDS:
		if surprise_keepsake_nodes.has(s_id):
			var k_node: Node3D = surprise_keepsake_nodes[s_id]
			if k_node != null and k_node.visible:
				count += 1
	return count

func block_panel_neighbor_idx() -> int:
	if block_panel_mode == "talk" and talk_partner >= 0 and talk_partner < neighbors.size():
		return talk_partner
	if arrived_neighbor >= 0 and arrived_neighbor < neighbors.size():
		return arrived_neighbor
	if selected_neighbor >= 0 and selected_neighbor < neighbors.size():
		return selected_neighbor
	return -1

func active_panel_neighbor_idx() -> int:
	if mural_panel != null and mural_panel.visible:
		return celeste_index
	if music_panel != null and music_panel.visible:
		return rook_index
	if block_panel != null and block_panel.visible:
		return block_panel_neighbor_idx()
	return -1

func inspect_neighborhood_surprise(s_id: String) -> bool:
	if not NEIGHBORHOOD_SURPRISES.has(s_id):
		return false
	var idx := NEIGHBORHOOD_SURPRISE_IDS.find(s_id)
	if idx >= 0:
		surprise_guide_idx = idx
	var rec: Dictionary = NEIGHBORHOOD_SURPRISES[s_id]
	var s_pt: Vector2 = surprise_points.get(s_id, Vector2(rec.pos.x, rec.pos.z))
	var world_pos := Vector3(s_pt.x, 0.0, s_pt.y)
	in_overview = false
	in_wide_overview = false
	following_player = false
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
		selected = -1
	target = world_pos + Vector3(0.0, 1.8, 0.0)
	view_size = 52.0
	update_camera()
	update_occlusion(true)
	var newly_discovered := not discovered_surprises.has(s_id)
	discovered_surprises[s_id] = true
	if last_hinted_surprise_id == s_id:
		last_hinted_surprise_id = ""
	update_neighborhood_surprises_3d()
	if newly_discovered:
		save_godot_state()
	var title_str := String(rec.get("title", s_id))
	var badge_str := String(rec.get("badge", "Neighborhood Discovery"))
	var speaker_str := String(rec.get("speaker", "Neighbor"))
	var speech_str := String(rec.get("speech", ""))
	var summary_str := String(rec.get("summary", ""))
	var accent := Color(String(rec.get("accent", "f8cc58")))
	var keepsake_meta: Dictionary = SURPRISE_KEEPSAKE_META.get(s_id, {})
	var keepsake_label := String(keepsake_meta.get("label", ""))
	var all_found := discovered_surprises.size() >= NEIGHBORHOOD_SURPRISE_IDS.size()
	var surp_tag := "All 10/10 Keepsakes!" if all_found else ("%d/%d Surprises" % [discovered_surprises.size(), NEIGHBORHOOD_SURPRISE_IDS.size()])
	var burst_sub := "%s · Sparks: %d · %s" % [surp_tag, spark_count(), badge_str]
	if not keepsake_label.is_empty():
		burst_sub = "%s · Sparks: %d · Keepsake: %s" % [surp_tag, spark_count(), keepsake_label]
	show_speech_bubble("surprise:%s" % s_id, world_pos + Vector3.UP * (SPEECH_BUBBLE_HEIGHT_M + 0.35), speech_str)
	if newly_discovered:
		var burst_heading := ("10/10 Surprises: %s" % title_str) if all_found else ("Surprise Found: %s" % title_str)
		trigger_progress_cue("surprise_finale" if all_found else "surprise_discovery", s_id)
		trigger_feel_good_burst(
			burst_heading,
			burst_sub,
			world_pos + Vector3.UP * 2.2,
			accent
		)
		if all_found and not suppress_feel_good_burst:
			reward_banner_timer = 4.5
		var paired_n_id := String(keepsake_meta.get("neighbor", ""))
		var p_idx := active_panel_neighbor_idx()
		var active_panel_n_id := String(neighbors[p_idx].get("id", "")) if p_idx >= 0 else ""
		if not paired_n_id.is_empty() and active_panel_n_id == paired_n_id:
			var n_idx := neighbor_index_for_id(paired_n_id)
			var spk_name := String(neighbors[n_idx].name) if n_idx >= 0 else paired_n_id.capitalize()
			var p_surp := neighbor_surprise_memory_line(paired_n_id).trim_prefix("“").trim_suffix("”")
			last_panel_dialogue = ("%s: \"%s\"" % [spk_name, p_surp]) if not p_surp.is_empty() else ""
		else:
			last_panel_dialogue = ""
	update_mural_ui()
	update_music_ui()
	update_block_ui()
	update_objective_ui()
	update_guide_marker()
	update_guide_arrow()
	var line := "%s — %s (%d/%d Surprises Found)" % [title_str, String(rec.get("street", "")), discovered_surprises.size(), NEIGHBORHOOD_SURPRISE_IDS.size()]
	var keepsake_suffix := " · Keepsake: %s" % keepsake_label if not keepsake_label.is_empty() else ""
	var sub := "%s: \"%s\" · %s%s (Shift+D for next surprise)" % [speaker_str, speech_str, summary_str, keepsake_suffix]
	if info != null:
		info.text = "%s\n%s\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [line, sub]
	announce_a11y_status("%s%s. %s says: %s" % [line, keepsake_suffix, speaker_str, speech_str])
	return true

func cycle_neighborhood_surprise(target_idx: int = -1) -> bool:
	if NEIGHBORHOOD_SURPRISE_IDS.is_empty():
		return false
	if target_idx < 0:
		var obj := current_objective()
		if String(obj.get("id", "")) == "explore" and obj.has("surprise_id"):
			target_idx = NEIGHBORHOOD_SURPRISE_IDS.find(String(obj.get("surprise_id", "")))
		elif not last_hinted_surprise_id.is_empty() and not discovered_surprises.has(last_hinted_surprise_id):
			target_idx = NEIGHBORHOOD_SURPRISE_IDS.find(last_hinted_surprise_id)
	if target_idx >= 0 and target_idx < NEIGHBORHOOD_SURPRISE_IDS.size():
		surprise_guide_idx = target_idx
	else:
		surprise_guide_idx = (surprise_guide_idx + 1) % NEIGHBORHOOD_SURPRISE_IDS.size()
	return inspect_neighborhood_surprise(NEIGHBORHOOD_SURPRISE_IDS[surprise_guide_idx])

func spark_count() -> int:
	var count := visited_neighbors.size() + mural_placements.size() + discovered_surprises.size()
	if rook_soundcheck_done:
		count += 1
	if gathering_layout in GATHERING_LAYOUTS:
		count += 1
	if block_opened:
		count += 2
	if String(keepsake_photo.get("status", "unasked")) == "taken":
		count += 1
	count += epilogue_returned.size()
	count += hosting_results.size()
	if civic_phase == "done":
		count += 1
	if film_phase == "done":
		count += 1
	if history_read:
		count += 1
	if blackhawk_discovered:
		count += 1
	return count

func build_celebration_burst() -> void:
	celebration_gem_meshes.clear()
	celebration_burst_node = Node3D.new()
	celebration_burst_node.name = "CelebrationBurst"
	celebration_burst_node.visible = false
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_smooth_group(-1)
	colored_prism(st, Vector3.ZERO, 0.22, 0.0, 0.30, 4, Color.WHITE, Color(0, 0, 0, 0))
	colored_prism(st, Vector3.ZERO, 0.22, 0.0, -0.30, 4, Color.WHITE.darkened(0.12), Color(0, 0, 0, 0))
	st.generate_normals()
	var gem_mesh := st.commit()
	var gem_colors: Array[Color] = [
		Color("ffe394"), Color("5fd4ba"), Color("f5a3d0"), Color("f8cc58"),
		Color("9ef5e5"), Color("ffb35c"), Color("ffe394"), Color("5fd4ba")
	]
	for g_i in range(8):
		var gem := MeshInstance3D.new()
		gem.name = "SparkGem_%d" % g_i
		gem.mesh = gem_mesh
		var g_mat := mural_material(gem_colors[g_i % gem_colors.size()])
		g_mat.no_depth_test = true
		g_mat.render_priority = 11
		gem.material_override = g_mat
		celebration_burst_node.add_child(gem)
		celebration_gem_meshes.append(gem)
	celebration_burst_label = make_label_3d("CelebrationBurstLabel", "* +1 Neighborhood Spark *", Vector3(0.0, 1.45, 0.0), Color("ffe48f"), 0.011, 24)
	celebration_burst_node.add_child(celebration_burst_label)
	add_child(celebration_burst_node)

func build_reward_banner(layer: CanvasLayer) -> void:
	reward_banner_style = StyleBoxFlat.new()
	reward_banner_style.bg_color = Color(0.08, 0.14, 0.18, 0.94)
	reward_banner_style.border_color = Color("f8cc58")
	reward_banner_style.set_border_width_all(2)
	reward_banner_style.set_corner_radius_all(8)
	reward_banner_style.content_margin_left = 12
	reward_banner_style.content_margin_right = 12
	reward_banner_style.content_margin_top = 5
	reward_banner_style.content_margin_bottom = 5
	reward_banner = PanelContainer.new()
	reward_banner.name = "RewardBanner"
	reward_banner.mouse_filter = Control.MOUSE_FILTER_IGNORE
	reward_banner.add_theme_stylebox_override("panel", reward_banner_style)
	reward_banner.visible = false
	var vbox := VBoxContainer.new()
	vbox.mouse_filter = Control.MOUSE_FILTER_IGNORE
	vbox.add_theme_constant_override("separation", 1)
	reward_banner.add_child(vbox)
	reward_title_label = Label.new()
	reward_title_label.name = "RewardTitle"
	reward_title_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	reward_title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	reward_title_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	reward_title_label.clip_text = true
	reward_title_label.add_theme_font_size_override("font_size", 15)
	reward_title_label.add_theme_color_override("font_color", Color("ffe48f"))
	vbox.add_child(reward_title_label)
	reward_body_label = Label.new()
	reward_body_label.name = "RewardBody"
	reward_body_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	reward_body_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	reward_body_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	reward_body_label.clip_text = true
	reward_body_label.max_lines_visible = 2
	reward_body_label.add_theme_font_size_override("font_size", 13)
	reward_body_label.custom_minimum_size.y = 2.0 * (reward_body_label.get_theme_font("font").get_height(13) + reward_body_label.get_theme_constant("line_spacing"))
	reward_body_label.add_theme_color_override("font_color", Color("9ef5e5"))
	vbox.add_child(reward_body_label)
	layer.add_child(reward_banner)

func layout_reward_banner() -> void:
	if reward_banner == null:
		return
	if reward_banner_timer <= 0.0:
		reward_banner.visible = false
		return
	var area := play_area_rect()
	var w := minf(460.0, maxf(180.0, area.size.x - 16.0))
	var title_font := reward_title_label.get_theme_font("font")
	var title_size := reward_title_label.get_theme_font_size("font_size")
	var title_measure := title_font.get_multiline_string_size(reward_title_label.text, HORIZONTAL_ALIGNMENT_CENTER, w - reward_banner_style.get_margin(SIDE_LEFT) - reward_banner_style.get_margin(SIDE_RIGHT), title_size, -1, TextServer.BREAK_MANDATORY | TextServer.BREAK_WORD_BOUND | TextServer.BREAK_ADAPTIVE)
	var title_lines := maxi(1, int(ceil(title_measure.y / title_font.get_height(title_size))))
	reward_title_label.custom_minimum_size.y = ceil(title_measure.y + (title_lines - 1) * reward_title_label.get_theme_constant("line_spacing"))
	reward_banner.custom_minimum_size = Vector2(w, 0.0)
	reward_banner.size = Vector2(w, reward_banner.get_combined_minimum_size().y)
	reward_banner.position = Vector2(area.position.x + (area.size.x - w) * 0.5, area.position.y + 4.0)
	var fitted := fit_overlay_around_player(reward_banner.get_global_rect(), area)
	if fitted.has_area():
		reward_banner.position = fitted.position
	# Expanded Info can leave a very short street strip. Keep the reward queued
	# until it fits, instead of covering dialogue controls or spending its timer.
	reward_banner.visible = not in_overview and not in_wide_overview and fitted.has_area()
	if not reward_banner.visible and header_details_expanded and not speech_opened_info and not in_overview and not in_wide_overview:
		# Respect deliberately opened Info. Show the complete reward there while
		# preserving the requested explanation and sources below it.
		var prefix := "%s\n%s\n\n" % [reward_title_label.text, reward_body_label.text]
		if not info.text.begins_with(prefix):
			info.text = prefix + info.text.trim_prefix(reward_info_prefix)
			info.scroll_to_line(0)
		reward_info_prefix = prefix

func trigger_feel_good_burst(title_str: String, detail_str: String, world_pos: Vector3, accent: Color = Color("f8cc58"), milestone := false) -> void:
	if suppress_feel_good_burst:
		return
	reward_burst_count += 1
	var keep_finale := last_reward_title.begins_with("10/10") and reward_banner != null and reward_banner_timer > 1.0 and not title_str.begins_with("10/10")
	keep_finale = keep_finale or (reward_banner != null and reward_banner_timer > 0.0 and not reward_banner.visible and reward_banner_milestone and not milestone)
	if not keep_finale:
		last_reward_title = title_str
	if reward_banner != null and not keep_finale:
		reward_banner_milestone = milestone
		if reward_banner_style != null:
			reward_banner_style.border_color = accent.lightened(0.15)
		reward_title_label.text = "* %s" % title_str
		reward_body_label.text = detail_str
		reward_banner.modulate = Color.WHITE
		reward_banner.visible = true
		reward_banner_timer = 3.2
		layout_reward_banner()
	if celebration_burst_node != null:
		celebration_burst_node.position = world_pos
		celebration_burst_node.visible = true
		celebration_burst_age = 0.0
		celebration_burst_timer = 2.0
		if celebration_burst_label != null:
			celebration_burst_label.text = "* %s *" % title_str
			celebration_burst_label.modulate = accent.lightened(0.22)
		update_celebration_burst(0.01)

func update_celebration_burst(delta: float) -> void:
	if reward_banner != null and reward_banner_timer > 0.0:
		layout_reward_banner()
		if reward_banner.visible or (header_details_expanded and not speech_opened_info):
			reward_banner_timer -= delta
		if reward_banner_timer <= 0.45:
			reward_banner.modulate = Color(1.0, 1.0, 1.0, clampf(reward_banner_timer / 0.45, 0.0, 1.0))
		if reward_banner_timer <= 0.0 or in_overview or in_wide_overview:
			reward_banner.visible = false
			reward_banner_timer = 0.0
	if celebration_burst_node != null and celebration_burst_node.visible:
		celebration_burst_age += delta
		celebration_burst_timer -= delta
		var progress := clampf(celebration_burst_age / 2.0, 0.0, 1.0)
		var ring_r := 0.55 + progress * 1.65
		var lift := progress * 1.75
		for g_i in range(celebration_gem_meshes.size()):
			var gem := celebration_gem_meshes[g_i]
			if gem == null:
				continue
			var ang := TAU * float(g_i) / float(celebration_gem_meshes.size()) + celebration_burst_age * 2.8
			var bob := sin(celebration_burst_age * 5.0 + float(g_i)) * 0.16
			gem.position = Vector3(cos(ang) * ring_r, lift + bob, sin(ang) * ring_r)
			gem.rotation = Vector3(celebration_burst_age * 2.2, ang, celebration_burst_age * 1.7)
			gem.scale = Vector3.ONE * clampf(1.15 - progress * 0.75, 0.25, 1.15)
		if celebration_burst_label != null:
			celebration_burst_label.position = Vector3(0.0, 1.25 + lift * 0.85, 0.0)
			celebration_burst_label.visible = reward_banner == null or reward_banner_timer <= 0.0
		if celebration_burst_timer <= 0.0 or in_overview or in_wide_overview:
			celebration_burst_node.visible = false

func update_eatery_animation(delta: float) -> void:
	eatery_anim_clock = wrapf(eatery_anim_clock + delta, 0.0, 3600.0)
	for part in eatery_anim_parts:
		var e_i: int = part.idx
		if e_i >= eatery_counter_nodes.size() or not eatery_counter_nodes[e_i].visible:
			continue
		var nd: Node3D = part.node
		var ph := float(part.phase)
		match String(part.kind):
			"steam":
				var f := fposmod(eatery_anim_clock * 0.4 + ph, 1.0)
				var base_p: Vector3 = part.base
				nd.position = base_p + Vector3(sin(f * TAU + ph * 3.0) * 0.03, f * 0.5, 0.0)
				nd.scale = Vector3.ONE * (1.0 - f * 0.7)
			"spin":
				nd.rotation.y = wrapf(nd.rotation.y + delta * 3.49, -PI, PI)
			"flicker":
				var mat := (nd as MeshInstance3D).material_override as StandardMaterial3D
				if mat != null:
					var dip := 0.25 if fposmod(eatery_anim_clock * 0.7 + ph, 3.0) < 0.08 else 1.0
					mat.emission_energy_multiplier = (0.45 + 0.25 * sin(eatery_anim_clock * 6.0 + ph)) * dip
	if eatery_guide_idx >= 0 and eatery_guide_idx < eatery_host_nodes.size():
		animate_person_node(eatery_host_nodes[eatery_guide_idx], eatery_anim_clock * 3.0, 0.0, 0.7)

# --- Conversation-first UX: objective guidance, guide marker, talk prompt, dialogue choices ---

func neighbor_index_for_id(n_id: String) -> int:
	for i in range(neighbors.size()):
		if String(neighbors[i].get("id", "")) == n_id:
			return i
	return -1

## Plain-language direction from one map point to another. Game axes follow the DataSF/OSM
## local-metre projection: +x is east, +z is south. One Tenderloin block is about 145 m.
func compass_phrase(from_xz: Vector2, to_xz: Vector2) -> String:
	var d := to_xz - from_xz
	var dist := d.length()
	if dist < 10.0:
		return "right here"
	var sectors: Array[String] = ["east", "northeast", "north", "northwest", "west", "southwest", "south", "southeast"]
	var dir: String = sectors[posmod(int(round(atan2(-d.y, d.x) / (PI / 4.0))), 8)]
	if dist < 100.0:
		return "about %d m %s" % [int(round(dist / 10.0)) * 10, dir]
	var blocks := int(round(dist / 145.0))
	return "about a block %s" % dir if blocks <= 1 else "about %d blocks %s" % [blocks, dir]

func next_explore_surprise_id() -> String:
	var p_idx := active_panel_neighbor_idx()
	if p_idx >= 0 and p_idx < neighbors.size():
		var n_id := String(neighbors[p_idx].get("id", ""))
		var paired: Array = NEIGHBOR_SURPRISE_PAIRS.get(n_id, [])
		for p_s_id in paired:
			var s_id := String(p_s_id)
			if not discovered_surprises.has(s_id) and s_id in NEIGHBORHOOD_SURPRISE_IDS:
				return s_id
	if not last_hinted_surprise_id.is_empty() and not discovered_surprises.has(last_hinted_surprise_id):
		return last_hinted_surprise_id
	for s_id in NEIGHBORHOOD_SURPRISE_IDS:
		if not discovered_surprises.has(s_id):
			return s_id
	return ""

## The single next thing to do, derived from saved progress. `target` is where the guide
## marker points; `neighbor` is who can help (-1 when nobody in particular).
## Session-only tour progress. Reading this never awards progress or changes a save.
func landmark_tour_state() -> Dictionary:
	var stops: Array[Dictionary] = []
	for i in range(TOUR_MUSEUM_ERAS.size()):
		stops.append({"id": "museum:%d" % i, "name": TOUR_MUSEUM_TITLES[i], "target": MUSEUM_HUB_POS, "done": visited_museum_eras.has(TOUR_MUSEUM_ERAS[i]), "action": "Visit the Museum"})
	stops.append({"id": "park", "name": "Boeddeker Park", "target": Vector3(BOEDDEKER_PARK_ENTRANCE.x, 0.0, BOEDDEKER_PARK_ENTRANCE.y), "done": boeddeker_park_visited, "action": "Visit the Park"})
	stops.append({"id": "so_what", "name": "'So What' Easter Egg", "target": Vector3(SO_WHAT_AWNING_XZ.x, 0.0, SO_WHAT_AWNING_XZ.y), "done": so_what_visited, "action": "See 'So What'"})
	for i in range(NEIGHBORHOOD_EATERIES.size()):
		var rec: Dictionary = NEIGHBORHOOD_EATERIES[i]
		var pos: Vector3 = rec.pos
		if i < eatery_counter_points.size():
			pos = Vector3(eatery_counter_points[i].x, 0.0, eatery_counter_points[i].y)
		stops.append({"id": "eatery:%d" % i, "name": "%s (fictional)" % String(rec.name), "target": pos, "done": int(eatery_order_counts.get(String(rec.id), 0)) > 0, "action": "Order at Next Stop"})
	var count := 0
	var next: Dictionary = {}
	for stop in stops:
		if bool(stop.done):
			count += 1
		elif next.is_empty():
			next = stop
	return {"count": count, "total": stops.size(), "next": next}

func visit_next_landmark() -> bool:
	var obj := current_objective()
	var stop_id := String(obj.get("tour_id", ""))
	if stop_id.is_empty():
		return false
	last_panel_dialogue = ""
	var ok := false
	if stop_id.begins_with("museum:"):
		museum_hub_step = int(stop_id.get_slice(":", 1))
		ok = inspect_tenderloin_museum_hub()
	elif stop_id == "park":
		ok = inspect_boeddeker_park()
	elif stop_id == "so_what":
		ok = inspect_so_what_easter_egg()
	elif stop_id.begins_with("eatery:"):
		var idx := int(stop_id.get_slice(":", 1))
		cycle_eatery_guide(idx)
		ok = eatery_counter_interact(idx)
	return ok

## Keep inspected landmarks above an open conversation panel, including on phones.
func frame_landmark_view() -> void:
	release_speech_info()
	update_camera()
	var focus := target
	var area := play_area_rect()
	var want := Vector2(area.get_center().x, area.position.y + area.size.y * 0.68)
	pan_camera_by_screen_delta(want - camera.unproject_position(focus))
	update_occlusion(true)

func refresh_landmark_guidance() -> void:
	last_panel_dialogue = ""
	if mural_panel != null and mural_panel.visible:
		update_mural_ui()
	if music_panel != null and music_panel.visible:
		update_music_ui()
	update_block_ui()
	update_objective_ui()
	update_guide_marker()
	update_guide_arrow()

## Wait for the previous discovery banner to finish, including the protected 10/10 finale.
## Called from the frame loop so previsited landmarks also celebrate on reaching Chapter 6.
func update_landmark_tour_completion() -> void:
	if landmark_tour_celebrated or suppress_feel_good_burst or in_overview or in_wide_overview:
		return
	if discovered_surprises.size() < NEIGHBORHOOD_SURPRISE_IDS.size():
		return
	if reward_banner != null and reward_banner_timer > 0.0:
		return
	var tour := landmark_tour_state()
	if int(tour.count) != int(tour.total):
		return
	if String(current_objective().get("id", "")) != "explore":
		return
	landmark_tour_celebrated = true
	trigger_progress_cue("tour_complete", "All %d session stops" % int(tour.total))
	announce_a11y_status("Neighborhood Tour Complete! All %d stops visited this session. Your 10 keepsakes stay saved; the optional tour starts fresh next session." % int(tour.total))

func current_objective() -> Dictionary:
	var p := player_xz() if player != null else Vector2(PLAYER_START.x, PLAYER_START.z)
	var met := visited_neighbors.size()
	var total := neighbors.size()
	var bea_pos: Vector3 = neighbors[0].pos if total > 0 else PLAYER_START
	if not block_opened:
		var best := -1
		var best_d := INF
		for i in range(total):
			if not visited_neighbors.has(String(neighbors[i].get("id", ""))):
				var d := p.distance_to(neighbor_xz(i))
				if d < best_d:
					best_d = d
					best = i
		if best >= 0:
			var n: Dictionary = neighbors[best]
			return {"id": "meet", "neighbor": best, "has_target": true, "target": n.pos, "target_name": String(n.name), "text": "Meet %s (%d/%d neighbors met)" % [n.name, met, total], "hint": "%s is %s. Go say hello!" % [n.name, compass_phrase(p, neighbor_xz(best))]}
		if not (gathering_layout in GATHERING_LAYOUTS):
			return {"id": "layout", "neighbor": 0, "has_target": true, "target": bea_pos, "target_name": "Bea", "text": "Choose the gathering: Bea's Long Table or Dez & Celeste's Open Floor", "hint": "Bea wants a Long Table for stories and conversation. Dez and Celeste want an Open Floor for art and music. Both keep the sidewalk clear. Which should we set up?"}
		if mural_placements.size() < MURAL_MOTIFS.size():
			return {"id": "mural", "neighbor": celeste_index, "has_target": true, "target": MURAL_POS, "target_name": "Celeste's easel", "text": "Paint Sun, Wave and Rise on Celeste's easel (%d/3)" % mural_placements.size(), "hint": "Celeste's easel is %s. Add all three motifs." % compass_phrase(p, mural_xz())}
		if not rook_soundcheck_done:
			return {"id": "soundcheck", "neighbor": rook_index, "has_target": true, "target": ROOK_SPEAKER_POS, "target_name": "Rook's speaker", "text": "Run a soundcheck with Rook", "hint": "Rook's speaker is %s. One soundcheck and we're ready." % compass_phrase(p, speaker_xz())}
		return {"id": "open", "neighbor": 0, "has_target": true, "target": bea_pos, "text": "Open the block party with Bea (O)", "hint": "Everyone has met, the mural is painted, and the sound is checked. Let's open the block party!"}
	var kp := String(keepsake_photo.get("status", "unasked"))
	if kp == "unasked" and not epilogue_packing:
		return {"id": "photo", "neighbor": 0, "has_target": true, "target": bea_pos, "text": "Take the group keepsake photo (Y)", "hint": "Let's take a group photo by the mural. Rook would rather stay off camera."}
	if not is_epilogue_done():
		if not epilogue_packing:
			return {"id": "pack", "neighbor": neighbor_index_for_id("thanh"), "has_target": true, "target": neighbors[maxi(0, neighbor_index_for_id("thanh"))].pos, "text": "Pack up the borrowed gear (Y)", "hint": "Time to pack up and give back what we borrowed."}
		for lid in LOAN_IDS:
			if not epilogue_returned.has(lid):
				var owner_i := maxi(0, neighbor_index_for_id(String(LOAN_OWNERS.get(lid, "thanh"))))
				var loan_title := String(LOAN_TITLES.get(lid, lid))
				return {"id": "return", "neighbor": owner_i, "has_target": true, "target": neighbors[owner_i].pos, "text": "Return %s (Y) · %d/3 returned" % [loan_title, epilogue_returned.size()], "hint": "Next, return %s. %s is %s." % [loan_title, neighbors[owner_i].name, compass_phrase(p, neighbor_xz(owner_i))]}
	if not is_hosting_done():
		var prog_text := "Plan the party schedule with Bea (Z)"
		if programme_published.size() == PROGRAMME_SEGMENTS.size() and hosting_order.is_empty():
			prog_text = "Start hosting the afternoon (Z)"
		elif not hosting_order.is_empty():
			prog_text = "Host the next activity: %s (Z) · %d/4" % [programme_title(current_hosting_activity()), hosting_results.size()]
		return {"id": "programme", "neighbor": 0, "has_target": true, "target": bea_pos, "text": prog_text, "hint": "Let's line up the afternoon: stories, rhythm, shared art, and a quiet pause."}
	if civic_phase != "done":
		return {"id": "civic", "neighbor": 0, "has_target": true, "target": bea_pos, "text": "Hold the tenant listening circle (Q)", "hint": "Let's hold a peaceful tenant listening circle so every neighbor is heard."}
	if film_phase != "done":
		return {"id": "film", "neighbor": neighbor_index_for_id("dez"), "has_target": true, "target": neighbors[maxi(0, neighbor_index_for_id("dez"))].pos, "text": "Make the short film The Open Seat (.)", "hint": "Celeste and I want to make a little three-shot film. Want to help?"}
	if not history_read:
		return {"id": "comptons", "neighbor": -1, "has_target": true, "target": COMPTONS_POS, "target_name": "Compton's plaque", "text": "Read the Compton's Cafeteria plaque at Turk & Taylor (J)", "hint": "The Compton's Cafeteria plaque at Turk & Taylor is %s." % compass_phrase(p, comptons_xz())}
	if not blackhawk_discovered:
		return {"id": "blackhawk", "neighbor": -1, "has_target": true, "target": BLACKHAWK_POS, "target_name": "Black Hawk site", "text": "Visit the former Black Hawk jazz club at Turk & Hyde (H)", "hint": "The Black Hawk site at Turk & Hyde is %s." % compass_phrase(p, blackhawk_xz())}
	if discovered_surprises.size() < NEIGHBORHOOD_SURPRISE_IDS.size():
		var next_s_id := next_explore_surprise_id()
		var s_rec: Dictionary = NEIGHBORHOOD_SURPRISES.get(next_s_id, {})
		var s_pt: Vector2 = surprise_points.get(next_s_id, Vector2(s_rec.pos.x, s_rec.pos.z))
		var s_title := String(s_rec.get("title", next_s_id))
		var s_street := String(s_rec.get("street", ""))
		return {
			"id": "explore",
			"neighbor": -1,
			"has_target": true,
			"target": Vector3(s_pt.x, 0.0, s_pt.y),
			"target_name": s_title,
			"surprise_id": next_s_id,
			"text": "Spot %s (%d/%d surprises, Shift+D) · Museum (Shift+M)" % [s_title, discovered_surprises.size(), NEIGHBORHOOD_SURPRISE_IDS.size()],
			"hint": "Take your time. Spot the %d neighborhood surprises (%d/%d found, Shift+D)—next is %s (%s at %s)—or try the museum's Time-Portal on Eddy and the eateries along Turk." % [NEIGHBORHOOD_SURPRISE_IDS.size(), discovered_surprises.size(), NEIGHBORHOOD_SURPRISE_IDS.size(), s_title, compass_phrase(p, s_pt), s_street]
		}
	var tour := landmark_tour_state()
	var stop: Dictionary = tour.next
	if not stop.is_empty():
		var stop_pos: Vector3 = stop.target
		return {
			"id": "explore", "neighbor": -1, "has_target": true,
			"target": stop_pos, "target_name": String(stop.name), "tour_id": String(stop.id),
			"tour_action": String(stop.action),
			"text": "Tour %d/%d this session: %s" % [tour.count, tour.total, stop.name],
			"hint": "All 10 keepsakes are yours! Optional tour: %s, %s. %d/%d stops this session; tour progress starts fresh on reload. Ask a neighbor to show you the stop, or follow the gold marker." % [stop.name, compass_phrase(p, Vector2(stop_pos.x, stop_pos.z)), tour.count, tour.total]
		}
	return {
		"id": "explore",
		"neighbor": -1,
		"has_target": false,
		"target": Vector3.ZERO,
		"text": "All 10 keepsakes saved! Tour %d/%d this session complete!" % [tour.count, tour.total],
		"hint": "You've visited all %d tour stops this session and found every keepsake! Wander freely, revisit the museum (Shift+M), or switch to evening lights (Shift+L). Your keepsakes stay saved; the optional tour starts fresh on reload." % int(tour.total)
	}

func update_objective_ui() -> void:
	if progress_label != null:
		progress_label.text = "Sparks: %d · Keepsakes: %d/10" % [spark_count(), discovered_surprises.size()]
	if objective_label == null:
		return
	var ch := current_chapter()
	var next_text := String(current_objective().get("text", ""))
	if is_narrow_layout():
		objective_label.text = "Ch. %d · Next: %s" % [int(ch.num), next_text]
	else:
		objective_label.text = "Chapter %d: %s · Next: %s" % [int(ch.num), String(ch.title), next_text]

func screen_constant_scale(px_per_unit: float) -> float:
	if camera == null:
		return 1.0
	return px_per_unit * camera.size / maxf(bubble_viewport_size().y, 1.0)

## Floating gold diamond above the current objective target (screen-constant size).
func build_guide_marker() -> void:
	guide_marker = Node3D.new()
	guide_marker.name = "GuideMarker"
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_smooth_group(-1)
	var gold := Color("ffd25a")
	colored_prism(st, Vector3(0.0, 0.5, 0.0), 0.36, 0.0, 0.5, 4, gold, Color(0, 0, 0, 0))
	colored_prism(st, Vector3(0.0, 0.5, 0.0), 0.36, 0.0, -0.5, 4, gold.darkened(0.15), Color(0, 0, 0, 0))
	st.generate_normals()
	var gem := MeshInstance3D.new()
	gem.name = "GuideGem"
	gem.mesh = st.commit()
	var gem_mat := mural_material(gold)
	gem_mat.no_depth_test = true
	gem_mat.render_priority = 9
	gem.material_override = gem_mat
	guide_marker.add_child(gem)
	add_child(guide_marker)

func guide_marker_anchor(obj: Dictionary) -> Vector3:
	var t: Vector3 = obj.get("target", Vector3.ZERO)
	var lift := GUIDE_MARKER_LIFT_HIGH if int(obj.get("neighbor", -1)) >= 0 and String(obj.get("id", "")) != "mural" and String(obj.get("id", "")) != "soundcheck" else GUIDE_MARKER_LIFT_LOW
	return Vector3(t.x, lift, t.z)

func objective_target_name(obj: Dictionary) -> String:
	if obj.has("target_name"):
		return String(obj.target_name)
	var n_i := int(obj.get("neighbor", -1))
	return String(neighbors[n_i].name) if n_i >= 0 and n_i < neighbors.size() else "Next stop"

func update_guide_marker(obj: Dictionary = {}) -> void:
	if guide_marker == null:
		return
	if obj.is_empty():
		obj = current_objective()
	var tour_id := String(obj.get("tour_id", ""))
	if tour_id.begins_with("eatery:"):
		var idx := int(tour_id.get_slice(":", 1))
		if idx >= 0 and idx < eatery_counter_nodes.size():
			eatery_counter_nodes[idx].visible = true
	var show := bool(obj.get("has_target", false))
	if show:
		var t: Vector3 = obj.get("target", Vector3.ZERO)
		var near := player_xz().distance_to(Vector2(t.x, t.z)) < 3.5
		var n_i := int(obj.get("neighbor", -1))
		var engaged := n_i >= 0 and talk_partner == n_i and block_panel != null and block_panel.visible
		if near or engaged:
			show = false
	guide_marker.visible = show
	if not show:
		return
	guide_marker_target = guide_marker_anchor(obj)
	guide_marker_target_name = objective_target_name(obj)
	var s := screen_constant_scale(30.0)
	guide_marker.scale = Vector3.ONE * s
	guide_marker.position = guide_marker_target + Vector3.UP * (sin(ui_clock * 2.6) * 0.14 * s)
	guide_marker.rotation.y = wrapf(ui_clock * 1.4, -PI, PI)

func build_talk_prompt() -> void:
	talk_prompt_node = Node3D.new()
	talk_prompt_node.name = "TalkPrompt"
	talk_prompt_node.visible = false
	talk_prompt_bg = MeshInstance3D.new()
	talk_prompt_bg.name = "TalkPromptBackground"
	talk_prompt_bg.material_override = speech_bubble_material(Color(0.07, 0.11, 0.15, 0.92), 10)
	talk_prompt_node.add_child(talk_prompt_bg)
	talk_prompt_label = Label3D.new()
	talk_prompt_label.name = "TalkPromptText"
	talk_prompt_label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	talk_prompt_label.no_depth_test = true
	talk_prompt_label.render_priority = 12
	talk_prompt_label.pixel_size = SPEECH_BUBBLE_PIXEL
	talk_prompt_label.font_size = 22
	talk_prompt_label.outline_size = 0
	talk_prompt_label.modulate = Color("ffe48f")
	talk_prompt_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	talk_prompt_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	talk_prompt_node.add_child(talk_prompt_label)
	add_child(talk_prompt_node)

func nearest_neighbor_within(radius: float) -> int:
	if player == null:
		return -1
	var p := player_xz()
	var best := -1
	var best_d := radius
	for i in range(neighbors.size()):
		var d := p.distance_to(neighbor_xz(i))
		if d <= best_d:
			best_d = d
			best = i
	return best

## "Talk to Bea · T or tap" above the nearest neighbor you are not already talking with.
func update_talk_prompt() -> void:
	if talk_prompt_node == null:
		return
	var idx := nearest_neighbor_within(TALK_PROMPT_RADIUS_M)
	if idx >= 0:
		var n_id := String(neighbors[idx].get("id", ""))
		var talking := speech_bubble_anchor == n_id
		var in_panel := (talk_partner == idx and block_panel != null and block_panel.visible) or (idx == celeste_index and mural_panel != null and mural_panel.visible) or (idx == rook_index and music_panel != null and music_panel.visible)
		if talking or in_panel or in_overview or in_wide_overview:
			idx = -1
	if idx < 0:
		talk_prompt_node.visible = false
		talk_prompt_neighbor = -1
		return
	if idx != talk_prompt_neighbor:
		talk_prompt_neighbor = idx
		var prompt := "Talk to %s · T or tap" % String(neighbors[idx].name)
		talk_prompt_label.text = prompt
		var font: Font = ThemeDB.fallback_font
		var sz := font.get_string_size(prompt, HORIZONTAL_ALIGNMENT_CENTER, -1, 22)
		talk_prompt_label.offset = Vector2(0.0, 12.0 + (sz.y + 14.0) * 0.5)
		talk_prompt_bg.mesh = bubble_shape_mesh(sz.x + 24.0, sz.y + 14.0, 12.0, 0.0)
	var n_pos: Vector3 = neighbors[idx].pos
	talk_prompt_node.position = n_pos + Vector3.UP * SPEECH_BUBBLE_HEIGHT_M
	talk_prompt_node.scale = Vector3.ONE * speech_bubble_base_scale()
	talk_prompt_node.visible = true

func talk_prompt_screen_rect() -> Rect2:
	if talk_prompt_node == null or not talk_prompt_node.is_visible_in_tree():
		return Rect2()
	var text_size := ThemeDB.fallback_font.get_string_size(talk_prompt_label.text, HORIZONTAL_ALIGNMENT_CENTER, -1, 22)
	var scale_px := SPEECH_BUBBLE_PIXEL * talk_prompt_node.scale.y / screen_constant_scale(1.0)
	var size := Vector2(text_size.x + 24.0, text_size.y + 26.0) * scale_px
	var anchor := camera.unproject_position(talk_prompt_node.global_position)
	return Rect2(anchor - Vector2(size.x * 0.5, size.y), size)

## Talk to someone close by: chat if you are already beside them, otherwise walk over and the
## conversation starts on arrival. Returns false when nobody is within `radius` metres.
func talk_to_nearby_neighbor(radius: float = 8.0) -> bool:
	var idx := nearest_neighbor_within(radius)
	if idx < 0:
		return false
	if idx == celeste_index:
		if arrived_neighbor == celeste_index or arrived_mural:
			talk_with_celeste()
		elif walk_to_neighbor(celeste_index):
			if arrived_neighbor == celeste_index:
				talk_with_celeste()
			else:
				pending_celeste_talk = true
		return true
	if idx == rook_index:
		return request_rook_soundcheck()
	if arrived_neighbor == idx:
		talk_with_neighbor(idx)
	else:
		walk_to_neighbor(idx)
	return true

func show_conversation(index: int) -> void:
	talk_partner = index
	opening_conversation = true
	show_block_panel(true)
	opening_conversation = false
	frame_conversation(index)

## Keep the speaker (and their bubble) in the visible 3D area above the open panel.
func frame_conversation(index: int) -> void:
	if camera == null or index < 0 or index >= neighbors.size() or in_wide_overview:
		return
	release_speech_info()
	var n_pos: Vector3 = neighbors[index].pos
	var focus := Vector3(n_pos.x, 1.0 if uses_compact_activity_controls() else 2.2, n_pos.z)
	in_overview = false
	following_player = false
	if view_size > 90.0:
		view_size = 58.0
	target = focus
	update_camera()
	var area := play_area_rect()
	var want := area.get_center() if uses_compact_activity_controls() else Vector2(area.get_center().x, area.position.y + area.size.y * 0.66)
	pan_camera_by_screen_delta(want - camera.unproject_position(focus))
	remember_panel_framing(block_panel, focus)
	if uses_compact_activity_controls():
		refit_panel_camera()
	update_occlusion(true)

func conversation_partner_line(index: int, body: String) -> String:
	if index < 0 or index >= neighbors.size():
		return body
	return "%s: \"%s\"" % [String(neighbors[index].name), body]

## "What's next?" — the current partner (or whoever is closest) explains the next step.
func ask_whats_next() -> String:
	var obj := current_objective()
	var speaker := active_panel_neighbor_idx()
	if speaker < 0:
		if talk_partner >= 0 and talk_partner < neighbors.size():
			speaker = talk_partner
		else:
			speaker = nearest_neighbor_within(TALK_PROMPT_RADIUS_M)
	var hint := String(obj.get("hint", ""))
	if String(obj.get("id", "")) == "layout" and speaker >= 0:
		match String(neighbors[speaker].get("id", "")):
			"bea":
				hint = "I'd love a Long Table for stories and conversation. Dez and Celeste want an Open Floor for art and music. Both keep the sidewalk clear. What do you think?"
			"dez", "celeste":
				hint = "Bea wants a Long Table for stories and conversation. We'd love an Open Floor for art and music. Both keep the sidewalk clear. Your call!"
	elif String(obj.get("id", "")) == "explore" and speaker >= 0:
		var spk_id := String(neighbors[speaker].get("id", ""))
		var next_idx := next_undiscovered_surprise_for_neighbor(speaker)
		if next_idx >= 0 and next_idx < NEIGHBORHOOD_SURPRISE_IDS.size():
			var next_s_id: String = NEIGHBORHOOD_SURPRISE_IDS[next_idx]
			last_hinted_surprise_id = next_s_id
			var is_personal_pair: bool = (NEIGHBOR_SURPRISE_PAIRS.get(spk_id, []) as Array).has(next_s_id)
			var s_rec: Dictionary = NEIGHBORHOOD_SURPRISES.get(next_s_id, {})
			var s_pt: Vector2 = surprise_points.get(next_s_id, Vector2(s_rec.pos.x, s_rec.pos.z))
			var p_xz := player_xz() if player != null else neighbor_xz(speaker)
			var dir_str := compass_phrase(p_xz, s_pt)
			var s_title := String(s_rec.get("title", next_s_id))
			var s_street := String(s_rec.get("street", ""))
			if is_personal_pair:
				hint = "Have you spotted %s yet? Look %s at %s (%d/%d surprises found, Shift+D)." % [s_title, dir_str, s_street, discovered_surprises.size(), NEIGHBORHOOD_SURPRISE_IDS.size()]
			else:
				hint = "You found both of my favorite block surprises! Next, check out %s %s at %s (%d/%d found, Shift+D)." % [s_title, dir_str, s_street, discovered_surprises.size(), NEIGHBORHOOD_SURPRISE_IDS.size()]
		else:
			last_hinted_surprise_id = ""
			hint = String(obj.get("hint", ""))
		obj = current_objective()
	var line := conversation_partner_line(speaker, hint) if speaker >= 0 else hint
	if (block_panel != null and block_panel.visible) or (mural_panel != null and mural_panel.visible) or (music_panel != null and music_panel.visible):
		last_panel_dialogue = line
	if speaker >= 0:
		show_neighbor_speech(speaker, line)
	if mural_panel != null and mural_panel.visible:
		update_mural_ui()
	elif music_panel != null and music_panel.visible:
		update_music_ui()
	elif block_panel != null and block_panel.visible:
		update_block_ui()
	else:
		update_objective_ui()
	update_guide_marker(obj)
	update_guide_arrow()
	if info != null:
		var way := "Follow the gold marker · tap the street or use WASD to walk" if bool(obj.get("has_target", false)) else "No marker needed: wander and explore"
		info.text = "%s\n%s\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [line, way]
		if not any_side_panel_visible() and (speaker < 0 or in_overview or in_wide_overview):
			set_header_details(true, false)
	announce_a11y_status("Next: %s. %s" % [String(obj.get("text", "")), hint])
	return line

func end_conversation() -> void:
	var partner := -1
	if mural_panel != null and mural_panel.visible:
		partner = celeste_index
	elif music_panel != null and music_panel.visible:
		partner = rook_index
	elif talk_partner >= 0:
		partner = talk_partner
	elif arrived_neighbor >= 0 and arrived_neighbor < neighbors.size():
		partner = arrived_neighbor
	talk_partner = -1
	block_panel_mode = "hub"
	last_panel_dialogue = ""
	current_path.clear()
	walking_to_mural = false
	walking_to_speaker = false
	walking_to_history_stop = ""
	pending_celeste_talk = false
	pending_rook_talk = false
	update_route_ribbon(true)
	show_block_panel(false)
	show_mural_panel(false)
	show_music_panel(false)
	hide_speech_bubble()
	arrived_neighbor = -1
	arrived_mural = false
	arrived_speaker = false
	arrived_history_stop = ""
	selected_neighbor = -1
	var who := String(neighbors[partner].name) if partner >= 0 and partner < neighbors.size() else "the block"
	if not in_overview and not in_wide_overview and player != null:
		follow_player()
	var obj := current_objective()
	if info != null:
		var way := "Follow the gold marker to your next stop" if bool(obj.get("has_target", false)) else "Wander and explore at your own pace"
		info.text = "You said goodbye to %s.\nNext: %s · %s\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [who, String(obj.get("text", "")), way]
	announce_a11y_status("Said goodbye to %s. Next: %s" % [who, String(obj.get("text", ""))])
	update_objective_ui()
	update_guide_marker(obj)
	update_guide_arrow()

func keep_chatting() -> String:
	if talk_partner >= 0 and talk_partner < neighbors.size():
		return talk_with_neighbor(talk_partner)
	return ""

## The three context actions offered while chatting: the next objective, meeting someone else,
## and the full block action list.
func conversation_actions() -> Array[Dictionary]:
	var obj := current_objective()
	var acts: Array[Dictionary] = []
	if String(obj.get("id", "")) == "layout":
		acts.append({"id": "layout_table", "label": "Long Table (Bea)"})
		acts.append({"id": "layout_floor", "label": "Open Floor (Dez & Celeste)"})
		acts.append({"id": "hub", "label": "All Block Actions"})
		return acts
	match String(obj.get("id", "")):
		"meet":
			acts.append({"id": "walk_neighbor:%d" % int(obj.neighbor), "label": "Go Meet %s" % String(neighbors[int(obj.neighbor)].name)})
		"mural":
			acts.append({"id": "mural", "label": "Paint with Celeste"})
		"soundcheck":
			acts.append({"id": "soundcheck", "label": "Soundcheck with Rook"})
		"open":
			acts.append({"id": "open", "label": "Open Block Party!"})
		"photo":
			acts.append({"id": "epilogue", "label": "Take Group Photo"})
		"pack", "return":
			acts.append({"id": "epilogue", "label": "Pack Gear" if String(obj.id) == "pack" else "Return Gear (%d/3)" % epilogue_returned.size()})
		"programme":
			acts.append({"id": "programme", "label": block_programme_btn.text if block_programme_btn != null else "Plan Party Schedule"})
		"civic":
			acts.append({"id": "civic", "label": block_civic_btn.text if block_civic_btn != null else "Hold Tenant Circle"})
		"film":
			acts.append({"id": "film", "label": block_film_btn.text if block_film_btn != null else "Shoot Short Film"})
		"comptons":
			acts.append({"id": "comptons", "label": "Walk to Compton's"})
		"blackhawk":
			acts.append({"id": "blackhawk", "label": "Walk to Black Hawk"})
		_:
			if discovered_surprises.size() < NEIGHBORHOOD_SURPRISE_IDS.size():
				acts.append({"id": "surprise", "label": "Spot Surprise (%d/%d)" % [discovered_surprises.size(), NEIGHBORHOOD_SURPRISE_IDS.size()]})
			else:
				acts.append({"id": "landmark_tour", "label": String(obj.tour_action)} if obj.has("tour_id") else {"id": "museum", "label": "Visit the Museum"})
	var someone_else := -1
	for i in range(neighbors.size()):
		var cand := posmod(talk_partner + 1 + i, neighbors.size())
		if cand != talk_partner and not visited_neighbors.has(String(neighbors[cand].get("id", ""))):
			someone_else = cand
			break
	if someone_else < 0:
		someone_else = posmod(talk_partner + 1, maxi(1, neighbors.size()))
	for i in range(neighbors.size()):
		var cand2 := posmod(talk_partner + 1 + i, neighbors.size())
		if cand2 != talk_partner and "walk_neighbor:%d" % cand2 != String(acts[0].id) and not visited_neighbors.has(String(neighbors[cand2].get("id", ""))):
			someone_else = cand2
			break
	var other_id := "walk_neighbor:%d" % someone_else
	if String(acts[0].id) != other_id and someone_else != talk_partner and not visited_neighbors.has(String(neighbors[someone_else].get("id", ""))):
		acts.append({"id": other_id, "label": "Talk to %s" % String(neighbors[someone_else].name)})
	elif not history_read and String(acts[0].id) != "comptons":
		acts.append({"id": "comptons", "label": "See Compton's Plaque"})
	elif not blackhawk_discovered and String(acts[0].id) != "blackhawk":
		acts.append({"id": "blackhawk", "label": "Walk to Black Hawk"})
	elif discovered_surprises.size() < NEIGHBORHOOD_SURPRISE_IDS.size() and String(acts[0].id) != "surprise":
		acts.append({"id": "surprise", "label": "Spot Surprise (%d/%d)" % [discovered_surprises.size(), NEIGHBORHOOD_SURPRISE_IDS.size()]})
	elif String(obj.get("id", "")) == "explore" and discovered_surprises.size() >= NEIGHBORHOOD_SURPRISE_IDS.size():
		acts.append({"id": "eateries", "label": "Visit Eateries"})
	elif String(acts[0].id) != other_id and someone_else != talk_partner:
		acts.append({"id": other_id, "label": "Talk to %s" % String(neighbors[someone_else].name)})
	else:
		acts.append({"id": "museum", "label": "Visit the Museum"})
	acts.append({"id": "hub", "label": "All Block Actions"})
	return acts

func run_conversation_action(slot: int) -> bool:
	if slot < 0 or slot >= conv_action_ids.size():
		return false
	var act_id := conv_action_ids[slot]
	var partner := talk_partner
	var ok := run_conversation_action_id(act_id)
	# Block-wide steps reopen the panel as the full hub; stay in the conversation instead.
	if ok and partner >= 0 and act_id in ["epilogue", "programme", "civic", "film", "open", "layout_table", "layout_floor"] and block_panel != null and block_panel.visible:
		show_conversation(partner)
	return ok

func next_undiscovered_surprise_for_neighbor(neighbor_idx: int = -1) -> int:
	if neighbor_idx >= 0 and neighbor_idx < neighbors.size():
		var n_id := String(neighbors[neighbor_idx].get("id", ""))
		var paired: Array = NEIGHBOR_SURPRISE_PAIRS.get(n_id, [])
		for p_id in paired:
			var s_id := String(p_id)
			if not discovered_surprises.has(s_id):
				var p_idx := NEIGHBORHOOD_SURPRISE_IDS.find(s_id)
				if p_idx >= 0:
					return p_idx
	for u_i in range(NEIGHBORHOOD_SURPRISE_IDS.size()):
		if not discovered_surprises.has(NEIGHBORHOOD_SURPRISE_IDS[u_i]):
			return u_i
	return -1

func run_conversation_action_id(act_id: String) -> bool:
	if act_id.begins_with("walk_neighbor:"):
		return walk_to_neighbor(int(act_id.get_slice(":", 1)))
	match act_id:
		"layout_table":
			return choose_gathering_layout("table")
		"layout_floor":
			return choose_gathering_layout("floor")
		"mural":
			open_mural_from_block_panel()
		"soundcheck":
			return request_rook_soundcheck()
		"open":
			return open_block_gathering()
		"epilogue":
			advance_epilogue_step()
		"programme":
			advance_programme_and_hosting_step()
		"civic":
			advance_civic_step()
		"film":
			advance_film_step()
		"comptons":
			return walk_to_or_read_history_stop("comptons")
		"blackhawk":
			return walk_to_or_read_history_stop("blackhawk")
		"museum":
			last_panel_dialogue = ""
			var ok_m := inspect_tenderloin_museum_hub()
			update_block_ui()
			return ok_m
		"landmark_tour":
			return visit_next_landmark()
		"eateries":
			last_panel_dialogue = ""
			var ok_e := cycle_eatery_guide()
			update_block_ui()
			return ok_e
		"surprise":
			if String(current_objective().get("id", "")) == "explore":
				return cycle_neighborhood_surprise()
			return cycle_neighborhood_surprise(next_undiscovered_surprise_for_neighbor(talk_partner))
		"hub":
			block_panel_mode = "hub"
			var suggested := hub_button_for_objective(String(current_objective().get("id", "")))
			block_hub_page = maxi(0, block_buttons.find(suggested)) / BLOCK_ACTIONS_PER_PAGE
			show_block_panel(true)
		_:
			return false
	return true

func apply_block_panel_mode() -> void:
	var talk := block_panel_mode == "talk" and talk_partner >= 0
	var prior_focus := get_viewport().gui_get_focus_owner()
	for r in conv_rows:
		if r != null:
			r.visible = talk
	if block_actions_grid != null:
		block_actions_grid.visible = not talk
	if block_page_nav != null:
		block_page_nav.visible = not talk
	if not talk:
		layout_block_action_pages()
	if not talk:
		apply_hub_guidance()
		if block_panel.visible and (prior_focus == null or prior_focus in conv_buttons):
			var suggested := hub_button_for_objective(String(current_objective().get("id", "")))
			if suggested != null and suggested.is_visible_in_tree():
				suggested.grab_focus()
			else:
				block_buttons[block_hub_page * BLOCK_ACTIONS_PER_PAGE].grab_focus()
	if talk:
		var narrow := is_narrow_layout() or uses_short_side_panels()
		var acts := conversation_actions()
		for s in range(conv_action_btns.size()):
			var has := s < acts.size()
			conv_action_btns[s].visible = has
			conv_action_ids[s] = String(acts[s].id) if has else ""
			if has:
				var lbl := String(acts[s].label)
				if narrow:
					lbl = lbl.replace("Go Meet ", "Meet ").replace("All Block Actions", "All Actions").replace("Spot Surprise (", "Find ").replace("/10)", "/10").replace("Visit the Museum", "Museum").replace("Visit the Park", "Park").replace("Order at Next Stop", "Order Next").replace("Visit Eateries", "Eateries").replace(" with Celeste", "").replace(" with Rook", "").replace(" (Bea)", "").replace(" (Dez & Celeste)", "")
				conv_action_btns[s].text = lbl
		if conv_chat_btn != null:
			conv_chat_btn.text = "Chat More" if narrow else "Keep Chatting (T)"
		if conv_next_btn != null:
			conv_next_btn.text = "Next Step" if narrow else "What's Next?"
		if conv_bye_btn != null:
			conv_bye_btn.text = "Goodbye" if narrow else "Goodbye (Esc)"
		layout_walking_controls_and_hub()

func block_action_page_count() -> int:
	return maxi(1, ceili(float(BLOCK_ACTION_COUNT) / BLOCK_ACTIONS_PER_PAGE))

func uses_paged_block_actions() -> bool:
	# Six long action columns need desktop space; keep the panel bounded on tablets.
	return bubble_viewport_size().x < HUB_FULL_WIDTH or uses_side_block_hub()

## Short, wide windows need the scene beside the menu rather than above it.
func uses_side_block_hub() -> bool:
	return bubble_viewport_size().x >= SIDE_HUB_MIN_WIDTH and uses_short_side_panels() and block_panel != null and block_panel.visible and block_panel_mode == "hub"

func uses_short_side_panels() -> bool:
	var vp := bubble_viewport_size()
	return vp.x >= SIDE_ACTIVITY_MIN_WIDTH and vp.y < SIDE_HUB_MAX_HEIGHT

func panel_uses_side_dock(panel: Control) -> bool:
	return uses_short_side_panels() and (panel != block_panel or block_panel_mode != "hub" or bubble_viewport_size().x >= SIDE_HUB_MIN_WIDTH)

func uses_compact_narrow_activities() -> bool:
	var vp := bubble_viewport_size()
	return vp.x < SIDE_HUB_MIN_WIDTH and not uses_short_side_panels() and vp.y < COMPACT_ACTIVITY_MAX_HEIGHT and ((block_panel != null and block_panel.visible and block_panel_mode == "talk") or (mural_panel != null and mural_panel.visible) or (music_panel != null and music_panel.visible))

func uses_compact_activity_controls() -> bool:
	return has_side_panel_dock() or uses_compact_narrow_activities()

func has_side_panel_dock() -> bool:
	for panel in [block_panel, mural_panel, music_panel]:
		if panel != null and panel.visible and panel_uses_side_dock(panel):
			return true
	return false

func layout_walking_controls_and_hub() -> void:
	if controls == null or block_panel == null:
		return
	var narrow := is_narrow_layout()
	var side := has_side_panel_dock()
	var compact := uses_compact_activity_controls()
	var short_phone := uses_compact_narrow_activities()
	var vp := bubble_viewport_size()
	var dock_width := clampf(vp.x * 0.52, 312.0, 440.0)
	controls.offset_right = -(dock_width + 20.0) if side else -12.0
	controls.columns = 3 if compact else (2 if narrow else 3)
	controls.offset_top = -104.0 if compact else (-174.0 if narrow else -124.0)
	for child in controls.get_children():
		if child is Button:
			child.custom_minimum_size.y = 44.0 if compact else 50.0
			child.add_theme_font_size_override("font_size", 12 if compact else (14 if narrow else 19))
	map_control.text = "TL Map" if compact else "Tenderloin Map"
	map_control.tooltip_text = "Tenderloin Map"
	next_hint_control.text = ("Next" if vp.x < SIDE_HUB_MIN_WIDTH and side else "Next Step") if compact else "What's Next?"
	next_hint_control.tooltip_text = "What's Next?"
	zoom_in_control.text = "Zoom +" if compact else "Zoom In (+)"
	zoom_in_control.tooltip_text = "Zoom In (+)"
	zoom_out_control.text = "Zoom -" if compact else "Zoom Out (−)"
	zoom_out_control.tooltip_text = "Zoom Out (−)"
	update_walk_control()
	block_label.add_theme_font_size_override("font_size", 13 if side or narrow else 16)
	block_detail_label.add_theme_font_size_override("normal_font_size", 12 if side or narrow else 14)
	block_detail_label.custom_minimum_size.y = 20.0 if side else 30.0
	if compact and block_panel_mode == "talk":
		size_activity_detail(block_detail_label)
	for b in conv_buttons:
		b.add_theme_font_size_override("font_size", 13 if side or narrow else 15)
		b.clip_text = not compact
		b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART if compact else TextServer.AUTOWRAP_OFF
	for label in [mural_label, music_label]:
		if label != null:
			label.add_theme_font_size_override("font_size", 13 if side or narrow else 16)
	for detail in [mural_detail_label, music_stem_label]:
		if detail != null:
			size_activity_detail(detail)
	for b in mural_buttons + music_buttons:
		b.add_theme_font_size_override("font_size", 13 if side or narrow else 15)
	# Info remains scrollable when deliberately opened beside a short-screen dock.
	if info != null:
		info.custom_minimum_size.y = 24.0 if side else 90.0
		if compact and not uses_side_block_hub():
			# One complete Info line; full dialogue has its own two-line panel reader.
			info.custom_minimum_size.y = ceilf(info.get_theme_font("normal_font").get_height(info.get_theme_font_size("normal_font_size")))
		header_panel.offset_bottom = header_panel.offset_top + header_panel.get_combined_minimum_size().y
	for panel in [block_panel, mural_panel, music_panel]:
		if panel == null:
			continue
		# Hidden activity panels use the same geometry for focus-before-show calls.
		var dock: bool = panel_uses_side_dock(panel) and (panel != block_panel or panel.visible)
		if panel != block_panel:
			panel.get_child(0).add_theme_constant_override("separation", 1 if dock or short_phone else 2)
			if dock and panel.get_combined_minimum_size().y > vp.y - 12.0 - (header_panel.get_global_rect().end.y + 8.0):
				# Keep every 44px action and two reader lines when Info is also open.
				panel.get_child(0).add_theme_constant_override("separation", 0)
		panel.anchor_left = 1.0 if dock else 0.0
		panel.offset_left = -(dock_width + 12.0) if dock else 12.0
		panel.offset_right = -12.0
		panel.grow_vertical = Control.GROW_DIRECTION_BEGIN if short_phone else Control.GROW_DIRECTION_END
		if short_phone:
			panel.size = Vector2(vp.x - 24.0, 0.0)
			panel.offset_bottom = controls.offset_top - 8.0
			if panel != block_panel and vp.y + panel.offset_bottom - panel.get_combined_minimum_size().y < header_panel.get_global_rect().end.y + 8.0:
				panel.get_child(0).add_theme_constant_override("separation", 0)
			panel.offset_top = panel.offset_bottom - panel.get_combined_minimum_size().y
			continue
		panel.offset_top = header_panel.get_global_rect().end.y + 8.0 - vp.y if dock else ((-368.0 if narrow else -336.0) if panel == block_panel else (-396.0 if narrow else -354.0))
		if dock:
			panel.size = Vector2(dock_width, 0.0)
		else:
			panel.offset_bottom = -176.0 if narrow else -130.0

func queue_compact_panel_layout() -> void:
	if compact_panel_layout_busy or not uses_compact_narrow_activities():
		return
	var signature: Array = [bubble_viewport_size(), header_panel.size]
	for panel in [block_panel, mural_panel, music_panel]:
		signature.append([panel.get_combined_minimum_size(), panel.size, panel.visible])
	if signature == compact_panel_layout_signature:
		return
	compact_panel_layout_signature = signature
	if compact_panel_layout_pending:
		return
	compact_panel_layout_pending = true
	finish_compact_panel_layout.call_deferred()

func finish_compact_panel_layout() -> void:
	compact_panel_layout_pending = false
	if not uses_compact_narrow_activities():
		return
	compact_panel_layout_busy = true
	layout_walking_controls_and_hub()
	compact_panel_layout_busy = false
	refit_panel_after_layout()

func layout_block_action_pages() -> void:
	if block_actions_grid == null:
		return
	var narrow := uses_paged_block_actions()
	var count := block_action_page_count()
	block_hub_page = clampi(block_hub_page, 0, count - 1)
	block_actions_grid.columns = 2 if narrow else 6
	for i in range(mini(BLOCK_ACTION_COUNT, block_buttons.size())):
		block_buttons[i].add_theme_font_size_override("font_size", 13 if narrow else 15)
		block_buttons[i].visible = not narrow or i / BLOCK_ACTIONS_PER_PAGE == block_hub_page
	if not narrow and (block_page_prev.has_focus() or block_page_next.has_focus()):
		block_buttons[block_hub_page * BLOCK_ACTIONS_PER_PAGE].grab_focus()
	block_page_prev.visible = narrow
	block_page_next.visible = narrow
	block_page_prev.disabled = block_hub_page == 0
	block_page_next.disabled = block_hub_page == count - 1
	block_page_prev.text = "Previous"
	block_page_next.text = "Next %d/%d" % [mini(block_hub_page + 2, count), count]
	block_close_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL if narrow else Control.SIZE_SHRINK_END
	block_close_btn.custom_minimum_size.x = 44.0 if narrow else 94.0
	if narrow:
		block_label.text = "Block Actions · %d/%d · Sparks: %d" % [block_hub_page + 1, count, spark_count()]
	layout_walking_controls_and_hub()

func change_block_action_page(step: int) -> void:
	if block_panel_mode != "hub" or block_panel == null or not block_panel.visible or not uses_paged_block_actions():
		return
	var next := clampi(block_hub_page + step, 0, block_action_page_count() - 1)
	if next == block_hub_page:
		return
	block_hub_page = next
	layout_block_action_pages()
	block_buttons[block_hub_page * BLOCK_ACTIONS_PER_PAGE].grab_focus()
	announce_a11y_status("Block actions page %d of %d. %s" % [block_hub_page + 1, block_action_page_count(), block_buttons[block_hub_page * BLOCK_ACTIONS_PER_PAGE].text])

func conv_button(parent: Node, text: String, action: Callable) -> Button:
	var control := Button.new()
	control.text = text
	control.clip_text = true
	control.custom_minimum_size = Vector2(44, 44)
	control.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	control.focus_mode = Control.FOCUS_ALL
	style_game_button(control)
	control.add_theme_font_size_override("font_size", 16)
	control.pressed.connect(action)
	parent.add_child(control)
	conv_buttons.append(control)
	return control

## Conservative screen bounds of the articulated player, ground ring and YOU.
## Eight projected corners follow zoom, pose and the existing enlarged visual.
func player_overlay_rect() -> Rect2:
	if camera == null or player_visual == null or not player_visual.is_visible_in_tree() or in_overview or in_wide_overview or camera.is_position_behind(player_visual.global_position):
		return Rect2()
	var bounds := Rect2(camera.unproject_position(player_visual.global_position), Vector2.ZERO)
	for x in [-0.70, 0.70]:
		for y in [-0.05, PLAYER_HEIGHT_M + 0.05]:
			for z in [-0.70, 0.70]:
				bounds = bounds.expand(camera.unproject_position(player_visual.to_global(Vector3(x, y, z))))
	if player_nameplate != null and player_nameplate.is_visible_in_tree():
		# Label3D is billboarded: its local glyph quad uses the camera's axes,
		# not the character's rotated axes. Include its actual alignment/offset.
		var quad := player_nameplate.get_aabb()
		var pixels := player_nameplate.global_basis.get_scale().y / screen_constant_scale(1.0)
		var center := camera.unproject_position(player_nameplate.global_position)
		var label_rect := Rect2(center + Vector2(quad.position.x, -quad.end.y) * pixels, Vector2(quad.size.x, quad.size.y) * pixels)
		bounds = bounds.merge(label_rect.grow(float(player_nameplate.outline_size)))
	return bounds.grow(4.0)

## Keep full-size text clear of the player without moving anyone's camera.
## An empty result uses the existing queued reward / scrollable Info paths.
func fit_overlay_around_player(wanted: Rect2, area: Rect2, extra_blocked: Rect2 = Rect2()) -> Rect2:
	if wanted.size.x > area.size.x or wanted.size.y > area.size.y:
		return Rect2()
	var blocked := player_overlay_rect()
	if blocked.has_area():
		blocked = blocked.grow(2.0) # Billboard/world conversion can round subpixels.
	var regions: Array[Rect2] = [area]
	for obstacle in [blocked, extra_blocked]:
		if not obstacle.has_area():
			continue
		var remaining: Array[Rect2] = []
		for region in regions:
			if not region.intersects(obstacle):
				remaining.append(region)
				continue
			var cut := region.intersection(obstacle)
			remaining.append(Rect2(region.position, Vector2(region.size.x, cut.position.y - region.position.y)))
			remaining.append(Rect2(Vector2(region.position.x, cut.end.y), Vector2(region.size.x, region.end.y - cut.end.y)))
			remaining.append(Rect2(region.position, Vector2(cut.position.x - region.position.x, region.size.y)))
			remaining.append(Rect2(Vector2(cut.end.x, region.position.y), Vector2(region.end.x - cut.end.x, region.size.y)))
		regions = remaining
	var best := Rect2()
	var distance := INF
	for region in regions:
		if region.size.x < wanted.size.x or region.size.y < wanted.size.y:
			continue
		var pos := Vector2(clampf(wanted.position.x, region.position.x, region.end.x - wanted.size.x), clampf(wanted.position.y, region.position.y, region.end.y - wanted.size.y))
		var candidate := Rect2(pos, wanted.size)
		var movement := pos.distance_squared_to(wanted.position)
		if area.encloses(candidate) and (not blocked.has_area() or not candidate.intersects(blocked)) and (not extra_blocked.has_area() or not candidate.intersects(extra_blocked)) and movement < distance:
			best = candidate
			distance = movement
	return best

## The 3D view between the header and whatever panel or controls sit at the bottom.
func play_area_rect() -> Rect2:
	var vp := bubble_viewport_size()
	var top := 8.0
	if header_panel != null:
		top = header_panel.get_global_rect().end.y + 8.0
	var bottom := vp.y - 8.0
	if controls != null:
		bottom = controls.get_global_rect().position.y - 8.0
	var right := vp.x - 8.0
	for p in [block_panel, mural_panel, music_panel]:
		if p != null and p.visible:
			if panel_uses_side_dock(p):
				right = minf(right, p.get_global_rect().position.x - 8.0)
			else:
				bottom = minf(bottom, (p as Control).get_global_rect().position.y - 8.0)
	return Rect2(8.0, top, maxf(right - 8.0, 1.0), maxf(bottom - top, 1.0))

## Edge-of-screen arrow with name and distance when the next target is off-screen.
func update_guide_arrow() -> void:
	if guide_arrow == null or camera == null:
		return
	if guide_marker == null or not guide_marker.visible or not speech_bubble_anchor.is_empty():
		guide_arrow.visible = false
		return
	var screen := camera.unproject_position(guide_marker_target)
	var area := play_area_rect()
	if area.size.x <= 24.0 or area.size.y <= 24.0:
		guide_arrow.visible = false
		return
	if area.grow(-12.0).has_point(screen):
		guide_arrow.visible = false
		return
	var center := area.get_center()
	var dir := screen - center
	if dir.length_squared() < 1e-4:
		guide_arrow.visible = false
		return
	var inset := area.grow(-27.0)
	var half := inset.size * 0.5
	var t := minf(half.x / maxf(absf(dir.x), 1e-4), half.y / maxf(absf(dir.y), 1e-4))
	guide_arrow.position = center + dir * t
	guide_arrow_poly.rotation = dir.angle()
	var dist := player_xz().distance_to(Vector2(guide_marker_target.x, guide_marker_target.z))
	var arrow_title := guide_marker_target_name
	if is_narrow_layout() and arrow_title.length() > 22:
		arrow_title = arrow_title.substr(0, 21).strip_edges() + "..."
	guide_arrow_label.text = "%s · %d m" % [arrow_title, int(round(dist))]
	var lbl_size := guide_arrow_label.get_minimum_size()
	guide_arrow_label.size = lbl_size
	var lbl_pos := -dir.normalized() * 37.0 - lbl_size * 0.5
	var lbl_global := guide_arrow.position + lbl_pos
	lbl_global.x = clampf(lbl_global.x, area.position.x + 7.0, maxf(area.position.x + 7.0, area.end.x - lbl_size.x - 7.0))
	lbl_global.y = clampf(lbl_global.y, area.position.y + 7.0, maxf(area.position.y + 7.0, area.end.y - lbl_size.y - 7.0))
	# Keep the outlined objective name clear of the Talk prompt and transient UI.
	var occupied: Array[Rect2] = []
	if uses_compact_activity_controls():
		occupied.append(player_overlay_rect().grow(4.0))
	if reward_banner != null and reward_banner.is_visible_in_tree():
		occupied.append(reward_banner.get_global_rect())
	if talk_prompt_node != null and talk_prompt_node.is_visible_in_tree():
		occupied.append(talk_prompt_screen_rect())
	if is_story_card_visible():
		occupied.append(story_card.get_global_rect())
	for caption in visible_scene_captions:
		occupied.append(caption.rect)
	occupied.append(Rect2(guide_arrow.position - Vector2(20.0, 20.0), Vector2(40.0, 40.0)))
	var candidates: Array[Vector2] = [lbl_global]
	for reserved in occupied:
		candidates.append(Vector2(lbl_global.x, reserved.position.y - lbl_size.y - 7.0))
		candidates.append(Vector2(lbl_global.x, reserved.end.y + 7.0))
		candidates.append(Vector2(reserved.position.x - lbl_size.x - 7.0, lbl_global.y))
		candidates.append(Vector2(reserved.end.x + 7.0, lbl_global.y))
	for i in range(candidates.size()):
		candidates[i].x = clampf(candidates[i].x, area.position.x + 7.0, maxf(area.position.x + 7.0, area.end.x - lbl_size.x - 7.0))
		candidates[i].y = clampf(candidates[i].y, area.position.y + 7.0, maxf(area.position.y + 7.0, area.end.y - lbl_size.y - 7.0))
	candidates.sort_custom(func(a: Vector2, b: Vector2) -> bool: return (a + lbl_size * 0.5).distance_squared_to(guide_arrow.position) < (b + lbl_size * 0.5).distance_squared_to(guide_arrow.position))
	guide_arrow_label.visible = false
	for candidate in candidates:
		var rect := Rect2(candidate, lbl_size).grow(7.0)
		if not area.encloses(rect):
			continue
		var clear := true
		for reserved in occupied:
			if rect.intersects(reserved):
				clear = false
				break
		if clear:
			guide_arrow_label.position = candidate - guide_arrow.position
			guide_arrow_label.visible = true
			break
	guide_arrow.visible = true

func hub_button_for_objective(obj_id: String) -> Button:
	match obj_id:
		"meet":
			return block_next_btn
		"mural":
			return block_mural_btn
		"soundcheck":
			return block_rook_btn
		"open":
			return block_open_btn
		"photo", "pack", "return":
			return block_epilogue_btn
		"programme":
			return block_programme_btn
		"civic":
			return block_civic_btn
		"film":
			return block_film_btn
		"blackhawk":
			return block_west_btn
	return null

## Full action list: the suggested next step gets a gold highlight; steps that unlock later are dimmed
## (still clickable: they explain what to do first).
func apply_hub_guidance() -> void:
	var suggested := hub_button_for_objective(String(current_objective().get("id", "")))
	var locked: Array[Button] = []
	if not block_opened:
		if not is_block_ready():
			locked.append(block_open_btn)
		locked.append(block_epilogue_btn)
		locked.append(block_programme_btn)
	if not is_civic_available() and civic_phase == "idle":
		locked.append(block_civic_btn)
	if not is_film_available() and film_phase == "idle":
		locked.append(block_film_btn)
	for b in block_buttons:
		if b == null:
			continue
		var is_sug := b == suggested
		if button_suggest_style != null and button_normal_style != null:
			b.add_theme_stylebox_override("normal", button_suggest_style if is_sug else button_normal_style)
		b.modulate = Color(1.0, 1.0, 1.0, 0.55) if (locked.has(b) and not is_sug) else Color.WHITE
		b.tooltip_text = "Suggested next step" if is_sug else ("Unlocks later" if locked.has(b) else "")

func is_narrow_layout() -> bool:
	return bubble_viewport_size().x < SIDE_HUB_MIN_WIDTH

func any_side_panel_visible() -> bool:
	return (block_panel != null and block_panel.visible) or (mural_panel != null and mural_panel.visible) or (music_panel != null and music_panel.visible)

# --- Story: chapters, the story card, and the Long Table / Open Floor gathering choice ---

## Chapter from the furthest progress reached (players may do afternoon projects in any order).
func current_chapter() -> Dictionary:
	var idx := 0
	if block_opened:
		idx = 1
		if is_epilogue_done() or not programme_published.is_empty() or not hosting_order.is_empty():
			idx = 2
		if is_hosting_done():
			idx = 3
		if civic_phase == "done":
			idx = 4
		if film_phase == "done":
			idx = 5
	return STORY_CHAPTERS[idx]

func build_story_card(layer: CanvasLayer) -> void:
	var card_style := StyleBoxFlat.new()
	card_style.bg_color = Color(0.06, 0.10, 0.13, 0.95)
	card_style.border_color = Color(1.0, 0.85, 0.36, 1.0)
	card_style.set_border_width_all(2)
	card_style.set_corner_radius_all(10)
	card_style.content_margin_left = 14
	card_style.content_margin_right = 14
	card_style.content_margin_top = 10
	card_style.content_margin_bottom = 10
	story_card = PanelContainer.new()
	story_card.name = "StoryCard"
	story_card.add_theme_stylebox_override("panel", card_style)
	story_card.visible = false
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 6)
	story_card.add_child(col)
	story_title_label = Label.new()
	story_title_label.name = "StoryTitle"
	story_title_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	story_title_label.add_theme_font_size_override("font_size", 22)
	story_title_label.add_theme_color_override("font_color", Color("ffe48f"))
	col.add_child(story_title_label)
	story_body_label = make_activity_detail()
	story_body_label.name = "StoryBody"
	story_body_label.add_theme_font_size_override("normal_font_size", 16)
	story_body_label.add_theme_color_override("default_color", Color("fff8e8"))
	col.add_child(story_body_label)
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_END
	col.add_child(row)
	story_continue_btn = Button.new()
	story_continue_btn.name = "StoryContinue"
	story_continue_btn.text = "Continue"
	story_continue_btn.custom_minimum_size = Vector2(140, 44)
	story_continue_btn.focus_mode = Control.FOCUS_ALL
	style_game_button(story_continue_btn)
	story_continue_btn.add_theme_font_size_override("font_size", 17)
	story_continue_btn.pressed.connect(continue_story)
	row.add_child(story_continue_btn)
	layer.add_child(story_card)

func layout_story_card() -> void:
	if story_card == null:
		return
	var vp := bubble_viewport_size()
	var w := minf(560.0, vp.x - 24.0)
	var top := 12.0
	if header_panel != null:
		top = header_panel.get_global_rect().end.y + 10.0
	var style := story_card.get_theme_stylebox("panel")
	var text_width := maxf(1.0, w - style.get_minimum_size().x)
	var flags := TextServer.BREAK_MANDATORY | TextServer.BREAK_WORD_BOUND | TextServer.BREAK_ADAPTIVE
	var title_font := story_title_label.get_theme_font("font")
	var title_size := story_title_label.get_theme_font_size("font_size")
	var title_measure := title_font.get_multiline_string_size(story_title_label.text, HORIZONTAL_ALIGNMENT_LEFT, text_width, title_size, -1, flags)
	var title_lines := maxi(1, ceili(title_measure.y / title_font.get_height(title_size)))
	var title_height := ceilf(title_measure.y + (title_lines - 1) * story_title_label.get_theme_constant("line_spacing"))
	story_title_label.custom_minimum_size.y = title_height
	var body_font := story_body_label.get_theme_font("normal_font")
	var body_size := story_body_label.get_theme_font_size("normal_font_size")
	var body_padding := story_body_label.get_theme_stylebox("normal").get_minimum_size()
	# Reserve scrollbar width even before it appears so wrapping cannot push Start offscreen.
	var body_width := maxf(1.0, text_width - story_body_label.get_v_scroll_bar().get_combined_minimum_size().x - body_padding.x)
	var body_measure := body_font.get_multiline_string_size(story_body_label.text, HORIZONTAL_ALIGNMENT_LEFT, body_width, body_size, -1, flags)
	var body_lines := maxi(1, ceili(body_measure.y / body_font.get_height(body_size)))
	var body_height := ceilf(body_measure.y + (body_lines - 1) * story_body_label.get_theme_constant("line_separation") + body_padding.y)
	var chrome := style.get_minimum_size().y + title_height + story_continue_btn.get_combined_minimum_size().y + 12.0
	var available := maxf(1.0, vp.y - 12.0 - top)
	var above_controls := controls.get_global_rect().position.y - 8.0 - top if controls != null else available
	# Prefer to leave walking controls visible. On a short screen this modal card
	# may cover them so the reader still gets two lines and an on-screen Start.
	if above_controls >= chrome + body_font.get_height(body_size) * 2.0 + body_padding.y:
		available = minf(available, above_controls)
	story_body_label.custom_minimum_size.y = maxf(body_font.get_height(body_size) + body_padding.y, minf(body_height, available - chrome))
	story_card.custom_minimum_size = Vector2(w, 0.0)
	story_card.size = Vector2(w, 0.0)
	story_card.position = Vector2((vp.x - w) * 0.5, top)

func story_reader_has_focus() -> bool:
	var owner := get_viewport().gui_get_focus_owner()
	return story_body_label != null and owner != null and (owner == story_body_label or story_body_label.is_ancestor_of(owner))

func show_story_card(chapter: Dictionary, startup := false) -> void:
	if story_card == null:
		return
	story_title_label.text = "Chapter %d · %s" % [int(chapter.num), String(chapter.title)]
	story_body_label.text = String(chapter.intro)
	story_body_label.scroll_to_line(0)
	story_continue_btn.text = "Start Exploring" if startup else "Continue"
	startup_story_pending = startup
	story_card.visible = true
	update_music_ui()
	layout_story_card()
	story_continue_btn.call_deferred("grab_focus")
	announce_a11y_status("Chapter %d: %s. %s" % [int(chapter.num), String(chapter.title), String(chapter.intro)])

func hide_story_card() -> void:
	startup_story_pending = false
	if music_toggle_btn != null:
		music_toggle_btn.disabled = false
	if story_card != null:
		story_card.visible = false

func continue_story(with_music := true) -> void:
	var orient := is_story_card_visible() and startup_story_pending
	hide_story_card()
	if not orient or player == null:
		return
	# Keep orientation as the final announcement. Escape can dismiss without activating audio.
	if with_music and not music_playing:
		start_music_playback()
	frame_player_for_walking()
	update_music_ui()

func frame_player_for_walking() -> void:
	# Keep the player's position and progress; only bring the local scene into view.
	hide_story_card()
	hide_speech_bubble()
	talk_partner = -1
	block_panel_mode = "hub"
	last_panel_dialogue = ""
	show_block_panel(false)
	show_mural_panel(false)
	show_music_panel(false)
	follow_player()
	camera_yaw = 0.0
	camera_pitch_scale = 1.0
	view_size = 45.0
	target = Vector3(player.position.x, 1.0, player.position.z)
	update_camera()
	update_occlusion(true)
	update_guide_marker()
	get_viewport().gui_release_focus()
	info.text = "You're here. %s.\nFollow the gold marker or tap What's Next?" % location_phrase(player_xz())
	announce_a11y_status("You're here. %s. Follow the gold marker or tap What's Next?" % String(current_objective().text))

func is_story_card_visible() -> bool:
	return story_card != null and story_card.visible

## Center of the fictional temporary curb-lane closure next to Bea on Turk Street: the north
## parking lane between Taylor and Mason, so the sidewalk route stays clear.
func compute_gathering_layout_site() -> Dictionary:
	var q := nearest_street_point(Vector2(38.0, -8.0))
	var tng := nearest_street_tangent(q)
	if tng.x < 0.0:
		tng = -tng
	var north := Vector2(-tng.y, tng.x)
	if north.y > 0.0:
		north = -north
	return {"center": q + north * 3.4, "tangent": tng}

func build_gathering_layouts() -> void:
	var site := compute_gathering_layout_site()
	gathering_layout_center = site.center
	var tng: Vector2 = site.tangent
	gathering_layouts_node = Node3D.new()
	gathering_layouts_node.name = "GatheringLayouts"
	gathering_layouts_node.position = Vector3(gathering_layout_center.x, 0.0, gathering_layout_center.y)
	gathering_layouts_node.rotation.y = atan2(-tng.y, tng.x)
	var no_cap := Color(0, 0, 0, 0)
	# Sawhorse barricades at both ends of the fictional closure (shown with either layout)
	var closure_st := SurfaceTool.new()
	closure_st.begin(Mesh.PRIMITIVE_TRIANGLES)
	closure_st.set_smooth_group(-1)
	for end_x in [-6.3, 6.3]:
		for leg_z in [-1.0, 1.0]:
			colored_beam(closure_st, Vector3(float(end_x) - 0.15, 0.0, float(leg_z)), Vector3(float(end_x), 0.9, float(leg_z)), 0.06, Color("d8d4c8"))
			colored_beam(closure_st, Vector3(float(end_x) + 0.15, 0.0, float(leg_z)), Vector3(float(end_x), 0.9, float(leg_z)), 0.06, Color("d8d4c8"))
		for stripe in range(4):
			var z0 := -1.15 + float(stripe) * 0.575
			colored_box(closure_st, Vector3(float(end_x), 0.92, z0 + 0.29), Vector3(0.04, 0.09, 0.29), Vector2.RIGHT, Color("e8833a") if stripe % 2 == 0 else Color("f4f1ea"), Color("f4f1ea"))
	closure_st.generate_normals()
	var closure := MeshInstance3D.new()
	closure.name = "ClosureBarricades"
	closure.mesh = closure_st.commit()
	closure.material_override = vertex_color_material()
	gathering_layouts_node.add_child(closure)
	# Bea's Long Table: one long shared table with stools on both sides and Thanh's tea
	layout_table_node = Node3D.new()
	layout_table_node.name = "LayoutLongTable"
	var t_st := SurfaceTool.new()
	t_st.begin(Mesh.PRIMITIVE_TRIANGLES)
	t_st.set_smooth_group(-1)
	colored_box(t_st, Vector3(0.0, 0.76, 0.0), Vector3(4.6, 0.04, 0.45), Vector2.RIGHT, Color("8a6544"), Color("a07a55"))
	colored_box(t_st, Vector3(0.0, 0.806, 0.0), Vector3(4.4, 0.006, 0.18), Vector2.RIGHT, Color("efe3c4"), Color("efe3c4"))
	for leg_x in [-4.3, -1.5, 1.5, 4.3]:
		for leg_z in [-0.38, 0.38]:
			colored_beam(t_st, Vector3(float(leg_x), 0.0, float(leg_z)), Vector3(float(leg_x), 0.74, float(leg_z)), 0.07, Color("5a402d"))
	var stool_cols: Array[Color] = [Color("c37e71"), Color("5fb8a6"), Color("d6a449"), Color("8f7fb0")]
	for s_i in range(8):
		for side in [-0.95, 0.95]:
			var sx := -3.85 + float(s_i) * 1.1
			colored_prism(t_st, Vector3(sx, 0.0, float(side)), 0.05, 0.05, 0.44, 6, Color("2d3532"), no_cap)
			colored_prism(t_st, Vector3(sx, 0.44, float(side)), 0.22, 0.22, 0.06, 10, stool_cols[(s_i + (1 if side > 0.0 else 0)) % stool_cols.size()], stool_cols[s_i % stool_cols.size()].lightened(0.15))
	colored_prism(t_st, Vector3(0.0, 0.81, 0.0), 0.12, 0.09, 0.18, 10, Color("6a8d73"), Color("7da586"))
	for cup_x in [-2.2, -0.9, 0.9, 2.2]:
		colored_prism(t_st, Vector3(float(cup_x), 0.81, 0.2), 0.045, 0.04, 0.08, 8, Color("f4efe6"), Color("b68a4a"))
	t_st.generate_normals()
	var table_mesh := MeshInstance3D.new()
	table_mesh.name = "LongTableSet"
	table_mesh.mesh = t_st.commit()
	table_mesh.material_override = vertex_color_material()
	layout_table_node.add_child(table_mesh)
	gathering_layouts_node.add_child(layout_table_node)
	# Dez & Celeste's Open Floor: an open painted floor, a low riser and mic, and a lettering panel
	layout_floor_node = Node3D.new()
	layout_floor_node.name = "LayoutOpenFloor"
	var f_st := SurfaceTool.new()
	f_st.begin(Mesh.PRIMITIVE_TRIANGLES)
	f_st.set_smooth_group(-1)
	colored_box(f_st, Vector3(-0.6, 0.035, 0.0), Vector3(4.6, 0.008, 1.15), Vector2.RIGHT, Color("2f4f57"), Color("2f4f57"))
	var tile_cols: Array[Color] = [Color("e8c35a"), Color("5fb8a6"), Color("d9746a")]
	for tx in range(7):
		for tz in range(2):
			if (tx + tz) % 2 == 0:
				colored_box(f_st, Vector3(-4.2 + float(tx) * 1.2, 0.046, -0.5 + float(tz) * 1.0), Vector3(0.36, 0.004, 0.36), Vector2.RIGHT, tile_cols[(tx + tz) % 3], tile_cols[(tx + tz) % 3])
	colored_box(f_st, Vector3(4.7, 0.15, 0.0), Vector3(0.8, 0.15, 1.0), Vector2.RIGHT, Color("6e4b33"), Color("8a6544"))
	colored_beam(f_st, Vector3(4.6, 0.3, 0.0), Vector3(4.6, 1.6, 0.0), 0.04, Color("2d3532"))
	colored_prism(f_st, Vector3(4.6, 1.6, 0.0), 0.06, 0.05, 0.12, 8, Color("44494b"), Color("44494b"))
	colored_box(f_st, Vector3(5.3, 0.62, -0.75), Vector3(0.24, 0.32, 0.2), Vector2.RIGHT, Color("2b2b2b"), Color("3a3a3a"))
	colored_box(f_st, Vector3(-5.3, 1.05, 0.0), Vector3(0.05, 0.6, 0.8), Vector2.RIGHT, Color("f2ead8"), Color("f2ead8"))
	for band in range(3):
		colored_box(f_st, Vector3(-5.24, 0.7 + float(band) * 0.32, 0.0), Vector3(0.01, 0.08, 0.66), Vector2.RIGHT, tile_cols[band], tile_cols[band])
	for st_x in [-3.6, -1.2, 1.2]:
		colored_prism(f_st, Vector3(float(st_x), 0.0, -1.05), 0.05, 0.05, 0.44, 6, Color("2d3532"), no_cap)
		colored_prism(f_st, Vector3(float(st_x), 0.44, -1.05), 0.2, 0.2, 0.06, 10, Color("c37e71"), Color("d8988c"))
	f_st.generate_normals()
	var floor_mesh := MeshInstance3D.new()
	floor_mesh.name = "OpenFloorSet"
	floor_mesh.mesh = f_st.commit()
	floor_mesh.material_override = vertex_color_material()
	layout_floor_node.add_child(floor_mesh)
	gathering_layouts_node.add_child(layout_floor_node)
	# String lights once the gathering opens
	gathering_lights_node = Node3D.new()
	gathering_lights_node.name = "GatheringLights"
	var l_st := SurfaceTool.new()
	l_st.begin(Mesh.PRIMITIVE_TRIANGLES)
	l_st.set_smooth_group(-1)
	for px in [-5.9, 5.9]:
		for pz in [-1.25, 1.25]:
			colored_prism(l_st, Vector3(float(px), 0.0, float(pz)), 0.05, 0.04, 3.1, 6, Color("3b4744"), Color("3b4744"))
	for pz2 in [-1.25, 1.25]:
		colored_beam(l_st, Vector3(-5.9, 3.0, float(pz2)), Vector3(5.9, 3.0, float(pz2)), 0.025, Color("2d3532"))
	l_st.generate_normals()
	var poles := MeshInstance3D.new()
	poles.name = "LightPoles"
	poles.mesh = l_st.commit()
	poles.material_override = vertex_color_material()
	gathering_lights_node.add_child(poles)
	var b_st := SurfaceTool.new()
	b_st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for bz in [-1.25, 1.25]:
		for b_i in range(12):
			colored_prism(b_st, Vector3(-5.4 + float(b_i) * 0.98, 2.86, float(bz)), 0.07, 0.07, 0.12, 6, Color.WHITE, Color.WHITE)
	b_st.generate_normals()
	var bulbs := MeshInstance3D.new()
	bulbs.name = "LightBulbs"
	bulbs.mesh = b_st.commit()
	bulbs.material_override = mural_material(Color("ffe394"))
	gathering_lights_node.add_child(bulbs)
	gathering_layouts_node.add_child(gathering_lights_node)
	add_child(gathering_layouts_node)
	update_layout_3d()

func update_layout_3d() -> void:
	if gathering_layouts_node == null:
		return
	var chosen := gathering_layout in GATHERING_LAYOUTS
	gathering_layouts_node.visible = chosen
	layout_table_node.visible = gathering_layout == "table"
	layout_floor_node.visible = gathering_layout == "floor"
	gathering_lights_node.visible = chosen and block_opened

## The bounded choice from docs/CONCEPT.md. Either layout keeps the same sidewalk route clear and
## lets every neighbor take part; the other idea becomes a "next time" promise, not a failure.
func choose_gathering_layout(layout_id: String) -> bool:
	if not (layout_id in GATHERING_LAYOUTS) or block_opened:
		return false
	gathering_layout = layout_id
	if String(keepsake_photo.get("status", "unasked")) == "unasked":
		keepsake_photo["layout"] = layout_id
	browser_import_message = ""
	update_block_3d()
	save_godot_state()
	update_block_ui()
	var speaker := talk_partner if talk_partner >= 0 else nearest_neighbor_within(TALK_PROMPT_RADIUS_M)
	var speaker_id := String(neighbors[speaker].get("id", "")) if speaker >= 0 else ""
	var body := ""
	if layout_id == "table":
		match speaker_id:
			"bea":
				body = "Long Table it is: everyone gets a seat and a story. Dez and Celeste's Open Floor goes first in line next time."
			"dez", "celeste":
				body = "Long Table it is: everyone gets a seat and a story. Our Open Floor goes first in line next time."
			_:
				body = "Long Table it is: everyone gets a seat and a story. The Open Floor idea goes first in line next time."
	else:
		match speaker_id:
			"bea":
				body = "Open Floor it is: room for Dez's beat and Celeste's lettering. My Long Table goes first in line next time."
			"dez", "celeste":
				body = "Open Floor it is: room for the beat and the lettering. Bea's Long Table goes first in line next time."
			_:
				body = "Open Floor it is: room for Dez's beat and Celeste's lettering. Bea's Long Table goes first in line next time."
	var line := conversation_partner_line(speaker, body) if speaker >= 0 else body
	if speaker >= 0:
		show_neighbor_speech(speaker, line)
	if block_panel != null and block_panel.visible:
		last_panel_dialogue = line
		update_block_ui()
	var lay_pos := Vector3(gathering_layout_center.x, 2.0, gathering_layout_center.y)
	trigger_feel_good_burst("Gathering Layout: %s" % String(GATHERING_LAYOUT_TITLES[layout_id]), "Curb lane set up · Sidewalk route stays clear · Sparks: %d" % spark_count(), lay_pos, Color("f8cc58") if layout_id == "table" else Color("5fd4ba"))
	if info != null:
		info.text = "%s\nThe %s is set up in the curb lane beside Bea · Both layouts keep the sidewalk clear\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [line, String(GATHERING_LAYOUT_TITLES[layout_id])]
	announce_a11y_status("Chose the %s. %s" % [String(GATHERING_LAYOUT_TITLES[layout_id]), body])
	return true

## What a neighbor remembers about the layout choice after the gathering opens.
func layout_memory_line(n_id: String) -> String:
	if not (gathering_layout in GATHERING_LAYOUTS):
		return ""
	var table := gathering_layout == "table"
	match n_id:
		"bea":
			return "Bea: \"The Long Table worked: everyone had a seat and a story. I promised Dez and Celeste the Open Floor next time.\"" if table else "Bea: \"The Open Floor was the right call today. Next time we try my Long Table, I'm holding you to it.\""
		"celeste":
			return "Celeste: \"The Long Table framed our 3/3 easel like a warm neighborhood gallery—and Bea promised us the Open Floor next time.\"" if table else "Celeste: \"Seeing our Open Floor painted tiles beside the 3/3 sidewalk easel made the whole block feel like an art studio.\""
		"rook":
			return "Rook: \"The 80 BPM pocket carried right down the Long Table without anyone having to raise their voice.\"" if table else "Rook: \"The Open Floor gave Dez's beat and the 4-part groove plenty of room to breathe across the curb lane.\""
		"dez":
			return "Dez: \"The Long Table was cozy. Next time, Open Floor. Bea promised.\"" if table else "Dez: \"Look at that Open Floor! Celeste's lettering and my beat, side by side.\""
		"thanh":
			return "Thanh: \"My folding table made a fine Long Table. Plenty of tea to go around.\"" if table else "Thanh: \"The Open Floor gave everyone room to move. I kept the tea by the curb.\""
	return ""

func set_header_details(expanded: bool, refit_map := true) -> void:
	speech_opened_info = false # Explicit Info, route and hint requests take ownership.
	header_details_expanded = expanded
	if info != null:
		info.visible = expanded
		if expanded:
			info.scroll_to_line(0)
	var toggle := header_panel.find_child("HeaderInfoToggle", true, false) as Button
	if toggle != null:
		toggle.set_pressed_no_signal(expanded)
	# Visibility updates minimum height immediately; retain width and apply that
	# height before camera framing or overlay fitting reads the playable area.
	header_panel.offset_bottom = header_panel.offset_top + header_panel.get_combined_minimum_size().y
	layout_walking_controls_and_hub()
	if refit_map and (in_overview or in_wide_overview):
		refit_after_layout()
	elif following_player and block_panel != null and block_panel.visible and block_panel_mode == "hub":
		update_camera()

func update_conversation_ui(delta: float) -> void:
	ui_clock = wrapf(ui_clock + delta, 0.0, 3600.0)
	var chapter := current_chapter()
	if last_story_chapter >= 0 and int(chapter.num) != last_story_chapter:
		last_story_chapter = int(chapter.num)
		show_story_card(chapter)
	if is_story_card_visible():
		layout_story_card()
	# Keep details available on demand while leaving room for the street.
	if info != null:
		var show_info := header_details_expanded
		if info.visible != show_info:
			info.visible = show_info
	objective_refresh_timer -= delta
	if objective_refresh_timer <= 0.0:
		objective_refresh_timer = 0.5
		update_objective_ui()
		sync_web_a11y_status()
	var obj := current_objective()
	update_guide_marker(obj)
	update_talk_prompt()

func player_height_m() -> float:
	var min_y := INF
	var max_y := -INF
	for child in player_visual.get_children():
		if child is MeshInstance3D:
			var aabb: AABB = child.get_aabb()
			min_y = minf(min_y, child.position.y + aabb.position.y)
			max_y = maxf(max_y, child.position.y + aabb.end.y)
	return max_y - minf(0.0, min_y)

func player_xz() -> Vector2:
	return Vector2(player.position.x, player.position.z)

func neighbor_xz(index: int) -> Vector2:
	var p: Vector3 = neighbors[index].pos
	return Vector2(p.x, p.z)

func mural_xz() -> Vector2:
	return Vector2(MURAL_POS.x, MURAL_POS.z)

func mural_tangent() -> Vector2:
	if cached_mural_tangent.length_squared() < 1e-4:
		var st := nearest_street_tangent(mural_xz())
		cached_mural_tangent = -st if st.x < 0.0 else st
	return cached_mural_tangent

func mural_normal() -> Vector2:
	if cached_mural_normal.length_squared() < 1e-4:
		var t := mural_tangent()
		cached_mural_normal = Vector2(-t.y, t.x)
	return cached_mural_normal

func mural_stand_xz() -> Vector2:
	return mural_xz() + mural_normal() * 1.45

func mural_corner_points() -> Array[Vector2]:
	var c := mural_xz()
	var t := mural_tangent()
	var n := mural_normal()
	var corners: Array[Vector2] = []
	for sx in [-MURAL_HALF_EXTENTS.x, MURAL_HALF_EXTENTS.x]:
		for sz in [-MURAL_HALF_EXTENTS.y, MURAL_HALF_EXTENTS.y]:
			corners.append(c + t * sx + n * sz)
	return corners

func is_point_in_mural_footprint(pt: Vector2, clearance: float = PLAYER_RADIUS_M) -> bool:
	var rel := pt - mural_xz()
	var lx := absf(rel.dot(mural_tangent()))
	var lz := absf(rel.dot(mural_normal()))
	return lx < (MURAL_HALF_EXTENTS.x + clearance) and lz < (MURAL_HALF_EXTENTS.y + clearance)

func speaker_xz() -> Vector2:
	return Vector2(ROOK_SPEAKER_POS.x, ROOK_SPEAKER_POS.z)

func speaker_tangent() -> Vector2:
	if cached_speaker_tangent.length_squared() < 1e-4:
		var st := nearest_street_tangent(speaker_xz())
		cached_speaker_tangent = -st if st.x < 0.0 else st
	return cached_speaker_tangent

func speaker_normal() -> Vector2:
	if cached_speaker_normal.length_squared() < 1e-4:
		var t := speaker_tangent()
		cached_speaker_normal = Vector2(-t.y, t.x)
	return cached_speaker_normal

func speaker_stand_xz() -> Vector2:
	return speaker_xz() + speaker_normal() * 1.25

func speaker_corner_points() -> Array[Vector2]:
	var c := speaker_xz()
	var t := speaker_tangent()
	var n := speaker_normal()
	var corners: Array[Vector2] = []
	for sx in [-SPEAKER_HALF_EXTENTS.x, SPEAKER_HALF_EXTENTS.x]:
		for sz in [-SPEAKER_HALF_EXTENTS.y, SPEAKER_HALF_EXTENTS.y]:
			corners.append(c + t * sx + n * sz)
	return corners

func is_point_in_speaker_footprint(pt: Vector2, clearance: float = PLAYER_RADIUS_M) -> bool:
	var rel := pt - speaker_xz()
	var lx := absf(rel.dot(speaker_tangent()))
	var lz := absf(rel.dot(speaker_normal()))
	return lx < (SPEAKER_HALF_EXTENTS.x + clearance) and lz < (SPEAKER_HALF_EXTENTS.y + clearance)

func material(color: Color) -> StandardMaterial3D:
	var result := StandardMaterial3D.new()
	result.albedo_color = color
	result.roughness = 1.0
	result.cull_mode = BaseMaterial3D.CULL_DISABLED
	return result

func translucent_material(color: Color) -> StandardMaterial3D:
	var result := StandardMaterial3D.new()
	result.albedo_color = color
	result.roughness = 1.0
	result.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	result.cull_mode = BaseMaterial3D.CULL_DISABLED
	return result

func point(p: Array, height: float) -> Vector3:
	return Vector3(p[0], height, p[1])

func triangle(surface: SurfaceTool, a: Vector3, b: Vector3, c: Vector3) -> void:
	surface.add_vertex(a)
	surface.add_vertex(b)
	surface.add_vertex(c)

func is_point_in_ring(pt: Vector2, ring: Array) -> bool:
	var inside := false
	var count := ring.size()
	var j := count - 1
	for i in range(count):
		var xi: float = ring[i][0]
		var zi: float = ring[i][1]
		var xj: float = ring[j][0]
		var zj: float = ring[j][1]
		var dy := zj - zi
		if absf(dy) < 1e-12:
			dy = 1e-12
		var intersect := ((zi > pt.y) != (zj > pt.y)) and (pt.x < (xj - xi) * (pt.y - zi) / dy + xi)
		if intersect:
			inside = not inside
		j = i
	return inside

func is_point_in_building_polygon(pt: Vector2, polygon: Dictionary) -> bool:
	var rings: Array = polygon.rings
	if rings.is_empty() or not is_point_in_ring(pt, rings[0]):
		return false
	for r in range(1, rings.size()):
		if is_point_in_ring(pt, rings[r]):
			return false
	return true

func get_history_stop_record(stop_id: String) -> Dictionary:
	var stops: Array = data.get("history_stops", [])
	for item in stops:
		if String(item.get("id", "")) == stop_id:
			return item
	var fallback_pt := [BLACKHAWK_POS.x, BLACKHAWK_POS.z] if stop_id == "blackhawk" else [COMPTONS_POS.x, COMPTONS_POS.z]
	return { "id": stop_id, "name": stop_id, "pos": fallback_pt }

func history_stop_xz(stop_id: String) -> Vector2:
	var rec := get_history_stop_record(stop_id)
	var pt: Array = rec.get("pos", rec.get("point", []))
	if pt.size() >= 2:
		return Vector2(float(pt[0]), float(pt[1]))
	return Vector2(BLACKHAWK_POS.x, BLACKHAWK_POS.z) if stop_id == "blackhawk" else Vector2(COMPTONS_POS.x, COMPTONS_POS.z)

func comptons_xz() -> Vector2:
	return history_stop_xz("comptons")

func blackhawk_xz() -> Vector2:
	return history_stop_xz("blackhawk")

func history_stop_pos_3d(stop_id: String) -> Vector3:
	var xz := history_stop_xz(stop_id)
	return Vector3(xz.x, 0.0, xz.y)

func walk_building_bin(pt: Vector2) -> Vector2i:
	return Vector2i(floori(pt.x / WALK_BUILDING_BIN_M), floori(pt.y / WALK_BUILDING_BIN_M))

func rebuild_walk_building_bins() -> void:
	walk_building_bins.clear()
	cell_walkable_cache.clear()
	# Buckets are only a conservative filter; exact polygons and wall distances still decide.
	for idx in range(current_building_rects.size()):
		var bounds := current_building_rects[idx].grow(WALK_BUILDING_INDEX_CLEARANCE_M)
		var first := walk_building_bin(bounds.position)
		var last := walk_building_bin(bounds.end)
		for bx in range(first.x, last.x + 1):
			for by in range(first.y, last.y + 1):
				var key := Vector2i(bx, by)
				if not walk_building_bins.has(key):
					walk_building_bins[key] = []
				walk_building_bins[key].append(idx) # Preserve authoritative building order.

func building_containing_point(pt: Vector2) -> String:
	for idx in walk_building_bins.get(walk_building_bin(pt), []):
		if not current_building_rects[idx].has_point(pt):
			continue
		var b: Dictionary = current_buildings[idx]
		for polygon in b.polygons:
			if is_point_in_building_polygon(pt, polygon):
				return b.id
	return ""

func dist_to_segment_2d(pt: Vector2, a: Vector2, b: Vector2) -> float:
	var ab := b - a
	var denom := ab.length_squared()
	var t := 0.0 if denom < 1e-12 else clampf((pt - a).dot(ab) / denom, 0.0, 1.0)
	return pt.distance_to(a + ab * t)

func rect_distance_2d(rect: Rect2, pt: Vector2) -> float:
	var cx := clampf(pt.x, rect.position.x, rect.end.x)
	var cy := clampf(pt.y, rect.position.y, rect.end.y)
	return pt.distance_to(Vector2(cx, cy))

func min_wall_distance(pt: Vector2, cutoff: float = INF) -> float:
	var best := cutoff
	var candidates: Array = walk_building_bins.get(walk_building_bin(pt), []) if cutoff <= WALK_BUILDING_INDEX_CLEARANCE_M else range(current_buildings.size())
	for idx in candidates:
		if best < INF:
			if not current_building_rects[idx].grow(best).has_point(pt):
				continue
		elif rect_distance_2d(current_building_rects[idx], pt) >= best:
			continue
		var b: Dictionary = current_buildings[idx]
		for polygon in b.polygons:
			for ring in polygon.rings:
				var r_size: int = ring.size()
				for i in range(r_size):
					var p0: Array = ring[i]
					var p1: Array = ring[(i + 1) % r_size]
					var d := dist_to_segment_2d(pt, Vector2(p0[0], p0[1]), Vector2(p1[0], p1[1]))
					if d < best:
						best = d
						if cutoff < INF:
							return best
	return best

func nearest_building_info(pt: Vector2) -> Dictionary:
	var best := INF
	var best_id := ""
	var best_tangent := Vector2(1.0, 0.0)
	for idx in range(current_buildings.size()):
		if rect_distance_2d(current_building_rects[idx], pt) >= best:
			continue
		var b: Dictionary = current_buildings[idx]
		for polygon in b.polygons:
			for ring in polygon.rings:
				var r_size: int = ring.size()
				for i in range(r_size):
					var p0: Array = ring[i]
					var p1: Array = ring[(i + 1) % r_size]
					var va := Vector2(p0[0], p0[1])
					var vb := Vector2(p1[0], p1[1])
					var d := dist_to_segment_2d(pt, va, vb)
					if d < best:
						best = d
						best_id = b.id
						var seg := vb - va
						if seg.length_squared() > 1e-9:
							best_tangent = seg.normalized()
	return {"id": best_id, "distance": best, "tangent": best_tangent}

func min_street_distance(pt: Vector2, cutoff: float = INF) -> float:
	# When a finite cutoff is supplied, returns on the first street segment within cutoff.
	var best := INF
	var bound := cutoff
	for w_idx in range(street_ways.size()):
		if bound < INF:
			if not street_way_rects[w_idx].grow(bound).has_point(pt):
				continue
		elif rect_distance_2d(street_way_rects[w_idx], pt) >= best:
			continue
		var pts: Array = street_ways[w_idx].points
		for i in range(1, pts.size()):
			var p0: Array = pts[i - 1]
			var p1: Array = pts[i]
			var d := dist_to_segment_2d(pt, Vector2(p0[0], p0[1]), Vector2(p1[0], p1[1]))
			if d < best:
				best = d
				if d < bound:
					bound = d
				if cutoff < INF and best <= cutoff:
					return best
	return best

func nearest_street_name(pt: Vector2) -> String:
	var best := INF
	var best_name := "Turk Street"
	for w_idx in range(street_ways.size()):
		if rect_distance_2d(street_way_rects[w_idx], pt) >= best:
			continue
		var pts: Array = street_ways[w_idx].points
		for i in range(1, pts.size()):
			var p0: Array = pts[i - 1]
			var p1: Array = pts[i]
			var d := dist_to_segment_2d(pt, Vector2(p0[0], p0[1]), Vector2(p1[0], p1[1]))
			if d < best:
				best = d
				best_name = String(street_ways[w_idx].get("name", "Turk Street"))
	return best_name

func nearest_street_tangent(pt: Vector2) -> Vector2:
	var best := INF
	var best_tangent := Vector2(1.0, 0.0)
	for w_idx in range(street_ways.size()):
		if rect_distance_2d(street_way_rects[w_idx], pt) >= best:
			continue
		var pts: Array = street_ways[w_idx].points
		for i in range(1, pts.size()):
			var p0: Array = pts[i - 1]
			var p1: Array = pts[i]
			var va := Vector2(p0[0], p0[1])
			var vb := Vector2(p1[0], p1[1])
			var d := dist_to_segment_2d(pt, va, vb)
			if d < best:
				best = d
				var seg := vb - va
				if seg.length_squared() > 1e-9:
					best_tangent = seg.normalized()
	return best_tangent

func is_walkable_point(pt: Vector2, clearance: float = WALK_CLEARANCE_M) -> bool:
	if not walk_bounds.has_point(pt):
		return false
	if min_street_distance(pt, MAX_STREET_CORRIDOR_M) > MAX_STREET_CORRIDOR_M:
		return false
	if building_containing_point(pt) != "":
		return false
	if is_point_in_mural_footprint(pt, PLAYER_RADIUS_M):
		return false
	if is_point_in_speaker_footprint(pt, PLAYER_RADIUS_M):
		return false
	if min_wall_distance(pt, clearance) < clearance:
		return false
	return true

func segment_walkable(a: Vector2, b: Vector2, clearance: float = WALK_CLEARANCE_M) -> bool:
	var dist := a.distance_to(b)
	if dist > 1.0:
		if not is_walkable_point(a.lerp(b, 0.5), clearance):
			return false
		if dist > 4.0:
			for frac in [0.25, 0.75, 0.125, 0.375, 0.625, 0.875, 0.05, 0.95]:
				if not is_walkable_point(a.lerp(b, frac), clearance):
					return false
	var step_sz := 0.45 if dist > 16.0 else 0.20
	var steps := maxi(1, int(ceil(dist / step_sz)))
	for i in range(steps + 1):
		var t := float(i) / float(steps)
		if not is_walkable_point(a.lerp(b, t), clearance):
			return false
	return true

func nearest_walkable_point(pt: Vector2, clearance: float = WALK_CLEARANCE_M) -> Vector2:
	var clamped := Vector2(
		clampf(pt.x, walk_bounds.position.x + 0.5, walk_bounds.end.x - 0.5),
		clampf(pt.y, walk_bounds.position.y + 0.5, walk_bounds.end.y - 0.5)
	)
	if is_walkable_point(clamped, clearance):
		return clamped
	var radii: Array[float] = [1.0, 2.0, 3.5, 5.0, 7.5, 10.0, 14.0, 20.0, 28.0]
	for radius in radii:
		var best_pt := clamped
		var best_d := INF
		var samples := 24
		for i in range(samples):
			var ang := TAU * float(i) / float(samples)
			var cand: Vector2 = clamped + Vector2(cos(ang), sin(ang)) * radius
			if is_walkable_point(cand, clearance):
				var d := pt.distance_to(cand)
				if d < best_d:
					best_d = d
					best_pt = cand
		if best_d < INF:
			return best_pt
	return Vector2(PLAYER_START.x, PLAYER_START.z)

func find_path(start_xz: Vector2, goal_xz: Vector2) -> Array[Vector2]:
	last_astar_expanded_cells = 0
	var safe_goal := nearest_walkable_point(goal_xz, WALK_CLEARANCE_M)
	var safe_start := nearest_walkable_point(start_xz, WALK_CLEARANCE_M)
	if safe_start.distance_to(safe_goal) < 0.05:
		return [safe_goal]
	if segment_walkable(safe_start, safe_goal):
		return [safe_start, safe_goal]
	var step := 2.0
	var max_cells := int(ceil(walk_bounds.size.x / step) * ceil(walk_bounds.size.y / step)) + 500
	var snap_pt := func(p: Vector2) -> Vector2i:
		return Vector2i(int(round(p.x / step)), int(round(p.y / step)))
	var cell_to_world := func(c: Vector2i) -> Vector2:
		return Vector2(float(c.x) * step, float(c.y) * step)
	var is_cell_passable := func(c: Vector2i) -> bool:
		if not cell_walkable_cache.has(c):
			cell_walkable_cache[c] = is_walkable_point(cell_to_world.call(c), WALK_CLEARANCE_M + WALK_CELL_EXTRA_CLEARANCE_M)
		return cell_walkable_cache[c]
	var s_cell: Vector2i = snap_pt.call(safe_start)
	var g_cell: Vector2i = snap_pt.call(safe_goal)
	var dirs: Array[Vector2i] = [
		Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1),
		Vector2i(1, 1), Vector2i(1, -1), Vector2i(-1, 1), Vector2i(-1, -1)
	]
	if not is_cell_passable.call(s_cell):
		for d in dirs:
			if is_cell_passable.call(s_cell + d):
				s_cell = s_cell + d
				break
	if not is_cell_passable.call(g_cell):
		for d in dirs:
			if is_cell_passable.call(g_cell + d):
				g_cell = g_cell + d
				break
	var open_set: Array[Vector2i] = [s_cell]
	# Keep priorities beside their cells; scanning no longer hashes every open cell.
	var open_priority: Array[float] = [Vector2(s_cell - g_cell).length()]
	var in_open: Dictionary = {s_cell: 0}
	var closed_set: Dictionary = {}
	var g_score: Dictionary = {s_cell: 0.0}
	var parent: Dictionary = {s_cell: null}
	var found := false
	var reached_cell := s_cell
	var expanded := 0
	while not open_set.is_empty() and expanded < max_cells:
		var best_idx := 0
		var best_f := open_priority[0]
		for idx_o in range(1, open_set.size()):
			var cand_f := open_priority[idx_o]
			if cand_f < best_f:
				best_f = cand_f
				best_idx = idx_o
		var cur: Vector2i = open_set[best_idx]
		open_set[best_idx] = open_set.back()
		open_priority[best_idx] = open_priority.back()
		in_open[open_set[best_idx]] = best_idx
		open_set.pop_back()
		open_priority.pop_back()
		in_open.erase(cur)
		closed_set[cur] = true
		expanded += 1
		if cur.distance_to(g_cell) <= 1.5 and segment_walkable(cell_to_world.call(cur), safe_goal):
			reached_cell = cur
			found = true
			break
		var cur_g := float(g_score.get(cur, 0.0))
		for d in dirs:
			var nxt: Vector2i = cur + d
			if closed_set.has(nxt) or not is_cell_passable.call(nxt):
				continue
			var step_cost := 1.0
			if d.x != 0 and d.y != 0:
				if not is_cell_passable.call(Vector2i(cur.x + d.x, cur.y)) or not is_cell_passable.call(Vector2i(cur.x, cur.y + d.y)):
					continue
				step_cost = 1.41421356
			var tentative_g := cur_g + step_cost
			if not g_score.has(nxt) or tentative_g < float(g_score[nxt]):
				parent[nxt] = cur
				g_score[nxt] = tentative_g
				var priority := tentative_g + Vector2(nxt - g_cell).length()
				if in_open.has(nxt):
					open_priority[int(in_open[nxt])] = priority
				else:
					in_open[nxt] = open_set.size()
					open_set.append(nxt)
					open_priority.append(priority)
	last_astar_expanded_cells = expanded
	if not found:
		return []
	var raw: Array[Vector2] = [safe_goal]
	var cursor: Variant = reached_cell
	while cursor != null:
		raw.push_front(cell_to_world.call(cursor))
		cursor = parent[cursor]
	raw[0] = safe_start
	var corners: Array[Vector2] = [raw[0]]
	var corner_raw_idx: Array[int] = [0]
	for i in range(1, raw.size() - 1):
		var d0 := (raw[i] - raw[i - 1]).normalized()
		var d1 := (raw[i + 1] - raw[i]).normalized()
		if d0.dot(d1) < 0.999:
			corners.append(raw[i])
			corner_raw_idx.append(i)
	if raw.size() > 1:
		corners.append(raw.back())
		corner_raw_idx.append(raw.size() - 1)
	var smooth: Array[Vector2] = [corners[0]]
	var idx := 0
	while idx < corners.size() - 1:
		var next_idx := -1
		for probe in range(corners.size() - 1, idx, -1):
			if segment_walkable(corners[idx], corners[probe]):
				next_idx = probe
				break
		if next_idx > idx:
			smooth.append(corners[next_idx])
			idx = next_idx
		else:
			for r_i in range(corner_raw_idx[idx] + 1, corner_raw_idx[idx + 1] + 1):
				smooth.append(raw[r_i])
			idx += 1
	return smooth

func update_route_ribbon(force: bool = false) -> void:
	update_walk_control()
	if current_path.is_empty():
		route_mesh.mesh = null
		last_ribbon_count = 0
		return
	var p_xz := player_xz()
	if not force and last_ribbon_count == current_path.size() and p_xz.distance_to(last_ribbon_pos) < 0.35:
		return
	last_ribbon_pos = p_xz
	last_ribbon_count = current_path.size()
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var pts: Array[Vector2] = [p_xz]
	for p in current_path:
		if pts.back().distance_to(p) > 0.1:
			pts.append(p)
	if pts.size() < 2:
		route_mesh.mesh = null
		return
	for i in range(pts.size() - 1):
		var a := Vector3(pts[i].x, 0.06, pts[i].y)
		var b := Vector3(pts[i + 1].x, 0.06, pts[i + 1].y)
		var seg := b - a
		if seg.length_squared() < 1e-6:
			continue
		var across := seg.normalized().cross(Vector3.UP) * 0.28
		triangle(st, a - across, b - across, b + across)
		triangle(st, a - across, b + across, a + across)
	st.generate_normals()
	route_mesh.mesh = st.commit()

## Restore close framing after detached views; retain the existing wide-zoom guard.
func resume_walking_view() -> void:
	if not following_player:
		view_size = 75.0 if (in_overview or in_wide_overview) else 45.0
	elif view_size > 110.0:
		view_size = 75.0
	in_overview = false
	in_wide_overview = false
	following_player = true

func walk_step(input_dir: Vector2, delta: float) -> bool:
	if input_dir.length_squared() < 1e-6 or delta <= 0.0:
		return false
	current_path.clear()
	selected_neighbor = -1
	arrived_neighbor = -1
	walking_to_mural = false
	arrived_mural = false
	pending_celeste_talk = false
	walking_to_speaker = false
	arrived_speaker = false
	pending_rook_talk = false
	walking_to_history_stop = ""
	arrived_history_stop = ""
	show_mural_panel(false)
	show_music_panel(false)
	show_block_panel(false)
	update_route_ribbon(true)
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
		selected = -1
	var dir := input_dir.normalized()
	if player_visual != null:
		player_visual.rotation.y = atan2(dir.x, dir.y)
	var total_dist := WALK_SPEED_M_PER_S * delta
	var steps := maxi(1, int(ceil(total_dist / 0.20)))
	var step_len := total_dist / float(steps)
	var moved := false
	for _s in range(steps):
		var cur := player_xz()
		var desired := cur + dir * step_len
		if is_walkable_point(desired):
			player.position = Vector3(desired.x, 0.0, desired.y)
			moved = true
			continue
		var nb := nearest_building_info(cur)
		var wall_t: Vector2 = nb.tangent
		var street_t := nearest_street_tangent(cur)
		var slide_candidates: Array[Vector2] = [
			wall_t * dir.dot(wall_t),
			street_t * dir.dot(street_t),
			Vector2(dir.x, 0.0),
			Vector2(0.0, dir.y)
		]
		var best_pos := cur
		var best_score := 0.0
		for cand_vec in slide_candidates:
			if cand_vec.length_squared() < 1e-4:
				continue
			var cand_step := cand_vec.normalized() * step_len * clampf(cand_vec.length(), 0.35, 1.0)
			var cand_pos := cur + cand_step
			var score := cand_step.dot(dir)
			if score > best_score and is_walkable_point(cand_pos):
				best_score = score
				best_pos = cand_pos
		if best_score > 0.0:
			player.position = Vector3(best_pos.x, 0.0, best_pos.y)
			moved = true
		else:
			break
	player.velocity = Vector3.ZERO
	target = Vector3(player.position.x, 1.0, player.position.z)
	resume_walking_view()
	update_camera()
	update_occlusion(false)
	update_walking_status()
	return moved

## "On Turk Street, near Taylor Street" from the real OSM street network (nearest intersection).
func location_phrase(p: Vector2) -> String:
	var st_name := nearest_street_name(p)
	var best := -1
	var best_d := 80.0
	for i in range(street_intersections.size()):
		var d := p.distance_to(street_intersections[i])
		if d < best_d:
			best_d = d
			best = i
	if best >= 0 and best < street_intersection_streets.size():
		var names := street_intersection_streets[best]
		if names.has(st_name):
			for nm in names:
				if nm != st_name:
					return "On %s, near %s" % [st_name, nm]
		return "On %s, near %s" % [st_name, " & ".join(names)]
	return "On %s" % st_name

func update_walking_status() -> void:
	info.text = "%s\nTap the street or use WASD/arrows to walk · T talks to people nearby · G: all block actions\nCity 2010 PDDL footprints · Streets © OpenStreetMap / ODbL" % location_phrase(player_xz())

func choose_next_neighbor(direction: int = 1) -> bool:
	if selected_neighbor >= 0:
		selected_neighbor = posmod(selected_neighbor + direction, neighbors.size())
	else:
		selected_neighbor = 0 if direction > 0 else neighbors.size() - 1
	return walk_to_neighbor(selected_neighbor)

func walk_to_neighbor(index: int) -> bool:
	if index < 0 or index >= neighbors.size():
		return false
	var n: Dictionary = neighbors[index]
	selected_neighbor = index
	arrived_neighbor = -1
	walking_to_mural = false
	arrived_mural = false
	pending_celeste_talk = false
	walking_to_speaker = false
	arrived_speaker = false
	pending_rook_talk = false
	walking_to_history_stop = ""
	arrived_history_stop = ""
	if talk_partner >= 0 and talk_partner != index:
		talk_partner = -1
		block_panel_mode = "hub"
		last_panel_dialogue = ""
	if index != celeste_index:
		show_mural_panel(false)
	if index != rook_index:
		show_music_panel(false)
	if index in [celeste_index, rook_index]:
		show_block_panel(false)
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
		selected = -1
	var goal := neighbor_xz(index)
	var dist := player_xz().distance_to(goal)
	if dist <= ARRIVAL_DISTANCE_M:
		resume_walking_view()
		finish_neighbor_arrival(index)
		return true
	current_path = find_path(player_xz(), goal)
	if current_path.size() > 1 and current_path[0].distance_to(player_xz()) < 0.20:
		current_path.remove_at(0)
	if current_path.is_empty():
		update_route_ribbon(true)
		info.text = "No walkable route to %s\nWASD/Arrows or tap street to walk\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % n.name
		set_header_details(true, false)
		announce_a11y_status("No walkable route to %s." % n.name)
		return false
	resume_walking_view()
	target = Vector3(player.position.x, 1.0, player.position.z)
	update_camera()
	update_occlusion(true)
	update_route_ribbon(true)
	info.text = "Walking to %s (%s) · %.1f m\nCollision route outside %d city footprints · Press Esc to stop\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [n.name, n.role, dist, data.buildings.size()]
	announce_a11y_status("Walking to %s (%s), %.1f m." % [n.name, n.role, dist])
	return true

func walk_to_mural() -> bool:
	selected_neighbor = -1
	arrived_neighbor = -1
	walking_to_mural = true
	arrived_mural = false
	pending_celeste_talk = false
	walking_to_speaker = false
	arrived_speaker = false
	pending_rook_talk = false
	walking_to_history_stop = ""
	arrived_history_stop = ""
	show_music_panel(false)
	show_block_panel(false)
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
		selected = -1
	var goal := mural_stand_xz()
	var dist := player_xz().distance_to(goal)
	if dist <= ARRIVAL_DISTANCE_M or player_xz().distance_to(mural_xz()) <= 2.0:
		resume_walking_view()
		finish_mural_arrival()
		return true
	current_path = find_path(player_xz(), goal)
	if current_path.size() > 1 and current_path[0].distance_to(player_xz()) < 0.20:
		current_path.remove_at(0)
	if current_path.is_empty():
		walking_to_mural = false
		update_route_ribbon(true)
		info.text = "No walkable route to Portable Mural Board\nWASD/Arrows or tap street to walk\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL"
		set_header_details(true, false)
		announce_a11y_status("No walkable route to Portable Mural Board.")
		return false
	resume_walking_view()
	target = Vector3(player.position.x, 1.0, player.position.z)
	update_camera()
	update_occlusion(true)
	update_route_ribbon(true)
	info.text = "Walking to Portable Mural Board (with Celeste) · %.1f m\nFreestanding sidewalk easel outside %d city footprints\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [dist, data.buildings.size()]
	announce_a11y_status("Walking to Portable Mural Board with Celeste, %.1f m." % dist)
	return true

func walk_to_speaker() -> bool:
	selected_neighbor = -1
	arrived_neighbor = -1
	walking_to_mural = false
	arrived_mural = false
	pending_celeste_talk = false
	walking_to_speaker = true
	arrived_speaker = false
	pending_rook_talk = false
	walking_to_history_stop = ""
	arrived_history_stop = ""
	show_mural_panel(false)
	show_block_panel(false)
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
		selected = -1
	var goal := speaker_stand_xz()
	var dist := player_xz().distance_to(goal)
	if dist <= ARRIVAL_DISTANCE_M or player_xz().distance_to(speaker_xz()) <= 1.8:
		resume_walking_view()
		finish_speaker_arrival()
		return true
	current_path = find_path(player_xz(), goal)
	if current_path.size() > 1 and current_path[0].distance_to(player_xz()) < 0.20:
		current_path.remove_at(0)
	if current_path.is_empty():
		walking_to_speaker = false
		update_route_ribbon(true)
		info.text = "No walkable route to Rook's Speaker\nWASD/Arrows or tap street to walk\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL"
		set_header_details(true, false)
		announce_a11y_status("No walkable route to Rook's Speaker.")
		return false
	resume_walking_view()
	target = Vector3(player.position.x, 1.0, player.position.z)
	update_camera()
	update_occlusion(true)
	update_route_ribbon(true)
	info.text = "Walking to Rook's Turk St Speaker · %.1f m\nFreestanding sidewalk monitor outside %d city footprints\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [dist, data.buildings.size()]
	announce_a11y_status("Walking to Rook's Turk Street Speaker, %.1f m." % dist)
	return true

func walk_to_history_stop(stop_id: String) -> bool:
	if not (stop_id in HISTORY_STOP_IDS):
		return false
	var rec := get_history_stop_record(stop_id)
	var title_str := String(rec.get("name", rec.get("title", stop_id)))
	selected_neighbor = -1
	arrived_neighbor = -1
	walking_to_mural = false
	arrived_mural = false
	pending_celeste_talk = false
	walking_to_speaker = false
	arrived_speaker = false
	pending_rook_talk = false
	walking_to_history_stop = stop_id
	arrived_history_stop = ""
	show_mural_panel(false)
	show_music_panel(false)
	show_block_panel(false)
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
		selected = -1
	var goal := history_stop_xz(stop_id)
	var dist := player_xz().distance_to(goal)
	if dist <= ARRIVAL_DISTANCE_M:
		resume_walking_view()
		finish_history_stop_arrival(stop_id)
		return true
	current_path = find_path(player_xz(), goal)
	if current_path.size() > 1 and current_path[0].distance_to(player_xz()) < 0.20:
		current_path.remove_at(0)
	if current_path.is_empty():
		walking_to_history_stop = ""
		update_route_ribbon(true)
		info.text = "No walkable route to %s\nWASD/Arrows or tap street to walk\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % title_str
		set_header_details(true, false)
		announce_a11y_status("No walkable route to %s." % title_str)
		return false
	resume_walking_view()
	target = Vector3(player.position.x, 1.0, player.position.z)
	update_camera()
	update_occlusion(true)
	update_route_ribbon(true)
	info.text = "Walking to %s · %.1f m\nWider Tenderloin route across %d measured footprints · Press Esc to stop\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [title_str, dist, all_buildings.size()]
	announce_a11y_status("Walking to %s, %.1f m." % [title_str, dist])
	return true

func finish_history_stop_arrival(stop_id: String) -> void:
	current_path.clear()
	walking_to_history_stop = ""
	arrived_history_stop = stop_id
	arrived_neighbor = -1
	walking_to_mural = false
	arrived_mural = false
	walking_to_speaker = false
	arrived_speaker = false
	pending_celeste_talk = false
	pending_rook_talk = false
	update_route_ribbon(true)
	if following_player:
		target = Vector3(player.position.x, 1.0, player.position.z)
		update_camera()
	update_occlusion(true)
	read_history_stop(stop_id)

func focus_history_stop_camera(stop_id: String) -> void:
	in_overview = false
	in_wide_overview = false
	following_player = false
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
		selected = -1
	var pos := history_stop_pos_3d(stop_id)
	target = Vector3(pos.x, 1.3, pos.z)
	view_size = 55.0
	update_camera()
	if get_viewport() != null and get_viewport().get_visible_rect().size.x < 600:
		target -= camera.global_basis.y * 4.2
		update_camera()
	update_occlusion(true)

func read_history_stop(stop_id: String) -> bool:
	if not (stop_id in HISTORY_STOP_IDS):
		return false
	var rec := get_history_stop_record(stop_id)
	var title_str := String(rec.get("name", rec.get("title", stop_id)))
	var note_str := String(rec.get("note", rec.get("source_note", "")))
	var newly_discovered := false
	if stop_id == "comptons":
		if not history_read:
			history_read = true
			newly_discovered = true
	else:
		if not blackhawk_discovered:
			blackhawk_discovered = true
			newly_discovered = true
	browser_import_message = ""
	update_history_stops_3d()
	show_block_panel(true)
	focus_history_stop_camera(stop_id)
	if newly_discovered:
		save_godot_state()
		trigger_progress_cue("history_" + stop_id, title_str)
	update_block_ui()
	var yr := int(rec.get("year", 1949 if stop_id == "blackhawk" else 1966))
	var extra_stage := " · Dodge Alley Block Concert live next door at Dodge Place" if stop_id == "blackhawk" else ""
	info.text = "%s (%d)%s\n%s\nCity 2010 survey & 5xmc-5bjj (2017) / PDDL · Streets © OpenStreetMap / ODbL" % [title_str, yr, extra_stage, note_str]
	announce_a11y_status("%s%s: %s" % [title_str, extra_stage, note_str])
	return true

func walk_to_or_read_history_stop(stop_id: String) -> bool:
	if arrived_history_stop == stop_id or player_xz().distance_to(history_stop_xz(stop_id)) <= ARRIVAL_DISTANCE_M + 0.5:
		return read_history_stop(stop_id)
	return walk_to_history_stop(stop_id)

func walk_to_comptons_corner() -> bool:
	return walk_to_history_stop("comptons")

func walk_to_black_hawk() -> bool:
	return walk_to_history_stop("blackhawk")

func inspect_so_what_easter_egg() -> bool:
	in_overview = false
	in_wide_overview = false
	following_player = false
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
		selected = -1
	target = SO_WHAT_VIEW_TARGET
	view_size = 84.0
	frame_landmark_view()
	if not so_what_visited:
		so_what_visited = true
		trigger_progress_cue("so_what_egg", "So What")
	refresh_landmark_guidance()
	var line := "145 Leavenworth (8th Floor) & 361 Turk St — 'So What' Musical Awning Easter Egg"
	var sub := "Dual-address Tenderloin complex (footprints 201006.0001527 & 201006.0003855) · Entrance awning arranged after Miles Davis's 'So What' (Live at the Black Hawk, 1961)"
	if info != null:
		info.text = "%s\n%s\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [line, sub]
	announce_a11y_status("%s: %s" % [line, sub])
	return true

func update_museum_portal_3d() -> void:
	var lens_col := Color("7be0e6")
	match active_time_era:
		"1961_jazz":
			lens_col = Color("f3c458")
		"1966_comptons":
			lens_col = Color("d884b8")
		"1907_cadillac":
			lens_col = Color("5ec2c6")
	if portal_lens_mesh != null:
		portal_lens_mesh.material_override = mural_material(lens_col)
	for r_i in range(portal_ring_meshes.size()):
		if portal_ring_meshes[r_i] != null:
			portal_ring_meshes[r_i].rotation_degrees = Vector3(90.0, float(museum_hub_step * 30 + r_i * 25), 0.0)

func inspect_tenderloin_museum_hub() -> bool:
	in_overview = false
	in_wide_overview = false
	following_player = false
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
		selected = -1
	target = MUSEUM_HUB_POS + Vector3(0.0, 2.2, 0.0)
	view_size = 64.0
	frame_landmark_view()
	var step := museum_hub_step % 4
	museum_hub_step = (museum_hub_step + 1) % 4
	var line := ""
	var sub := ""
	var era_title := "398 Eddy St Info Hub"
	match step:
		0:
			active_time_era = "present"
			era_title = "398 Eddy St Info Hub"
			line = "Tenderloin Museum & Central Info Hub — 398 Eddy St (Cadillac Hotel, 1907)"
			sub = "Cultural center & adventure base (footprint 201006.0001559) · Offers walking tours, live performances & the Living Archive Time-Portal (press Shift+M again to channel past eras!)"
		1:
			active_time_era = "1961_jazz"
			era_title = "1961 Black Hawk Jazz Era"
			line = "Tenderloin Museum Time-Portal » 1961: Black Hawk & 'So What' Jazz Era"
			sub = "Archive Portal tuned to April 1961 · Miles Davis sextet live at Turk & Hyde + the 145 Leavenworth / 361 Turk 'So What' brass-and-teal canopy!"
		2:
			active_time_era = "1966_comptons"
			era_title = "1966 Compton's Neon"
			line = "Tenderloin Museum Time-Portal » 1966: Compton's Cafeteria Midnight Neon"
			sub = "Archive Portal tuned to August 1966 · Late-night jukebox, coffee cups & neon solidarity at Taylor & Turk in the heart of the Tenderloin."
		3:
			active_time_era = "1907_cadillac"
			era_title = "1907 Cadillac Hotel"
			line = "Tenderloin Museum Time-Portal » 1907: Cadillac Hotel & Great White Way"
			sub = "Archive Portal tuned to 1907 · Grand reopening of the 4-story Cadillac Hotel at Eddy & Leavenworth with theater-district marquees and supper clubs."
	var docent_world := MUSEUM_HUB_POS + Vector3(-1.4, 0.0, 1.15) * 1.75
	show_speech_bubble("museum_docent", docent_world + Vector3.UP * SPEECH_BUBBLE_HEIGHT_M, MUSEUM_DOCENT_LINES[step % MUSEUM_DOCENT_LINES.size()])
	update_museum_portal_3d()
	if not visited_museum_eras.has(active_time_era):
		visited_museum_eras[active_time_era] = true
		trigger_progress_cue("museum_portal", era_title)
	refresh_landmark_guidance()
	if info != null:
		info.text = "%s\n%s\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [line, sub]
	announce_a11y_status("%s: %s" % [line, sub])
	return true

func cycle_eatery_guide(target_idx: int = -1) -> bool:
	if NEIGHBORHOOD_EATERIES.is_empty():
		return false
	if target_idx >= 0 and target_idx < NEIGHBORHOOD_EATERIES.size():
		eatery_guide_idx = target_idx
	else:
		eatery_guide_idx = (eatery_guide_idx + 1) % NEIGHBORHOOD_EATERIES.size()
	var rec: Dictionary = NEIGHBORHOOD_EATERIES[eatery_guide_idx]
	var e_pos: Vector3 = rec.get("pos", Vector3.ZERO)
	in_overview = false
	in_wide_overview = false
	following_player = false
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
		selected = -1
	target = e_pos + Vector3(0.0, 2.0, 0.0)
	view_size = 56.0
	frame_landmark_view()
	var e_id := String(rec.get("id", ""))
	if eatery_guide_idx < eatery_counter_nodes.size():
		eatery_counter_nodes[eatery_guide_idx].visible = true
		var host_lines: Array = EATERY_HOST_LINES.get(e_id, ["Welcome in!"])
		show_eatery_host_speech(eatery_guide_idx, String(host_lines[0]))
	var line := "%s — %s (fictional)" % [String(rec.get("name", "")), String(rec.get("kind", ""))]
	var sub := "%s · Specialty: %s (Stop %d/%d · Tap the counter to order · Shift+E for next fictionalized spot)" % [String(rec.get("street", "")), String(rec.get("specialty", "")), eatery_guide_idx + 1, NEIGHBORHOOD_EATERIES.size()]
	if info != null:
		info.text = "%s\n%s\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [line, sub]
	announce_a11y_status("%s: %s" % [line, sub])
	return true

func toggle_district_boundary() -> bool:
	district_boundary_visible = not district_boundary_visible
	browser_import_message = ""
	update_district_boundary_3d()
	save_godot_state()
	update_block_ui()
	var state_word := "Shown" if district_boundary_visible else "Hidden"
	var msg := "Transgender Cultural District boundary (DataSF 5xmc-5bjj, PDDL 1.0, founded 2017): %s within the wider Tenderloin." % state_word
	info.text = "%s\nRecognized 2017 city cultural district boundary within the wider %d-building Tenderloin scene\nCity 2010 survey & 5xmc-5bjj / PDDL · Streets © OpenStreetMap / ODbL" % [msg, all_buildings.size()]
	announce_a11y_status(msg)
	return district_boundary_visible

func walk_to_point(goal_xz: Vector2) -> bool:
	var safe_goal := nearest_walkable_point(goal_xz, WALK_CLEARANCE_M)
	if goal_xz.distance_to(safe_goal) > 28.5 or not is_walkable_point(safe_goal, WALK_CLEARANCE_M):
		current_path.clear()
		update_route_ribbon(true)
		info.text = "No walkable street point near (%.1f, %.1f) m\nTap a street corridor or use WASD/Arrows\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [goal_xz.x, goal_xz.y]
		set_header_details(true, false)
		announce_a11y_status("No walkable street point here.")
		return false
	selected_neighbor = -1
	arrived_neighbor = -1
	walking_to_mural = false
	arrived_mural = false
	pending_celeste_talk = false
	walking_to_speaker = false
	arrived_speaker = false
	pending_rook_talk = false
	walking_to_history_stop = ""
	arrived_history_stop = ""
	show_mural_panel(false)
	show_music_panel(false)
	show_block_panel(false)
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
		selected = -1
	current_path = find_path(player_xz(), safe_goal)
	if current_path.size() > 1 and current_path[0].distance_to(player_xz()) < 0.20:
		current_path.remove_at(0)
	if current_path.is_empty():
		update_route_ribbon(true)
		info.text = "No walkable route to point (%.1f, %.1f) m\nWASD/Arrows or tap street to walk\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [safe_goal.x, safe_goal.y]
		set_header_details(true, false)
		announce_a11y_status("No walkable route to street point.")
		return false
	resume_walking_view()
	target = Vector3(player.position.x, 1.0, player.position.z)
	update_camera()
	update_occlusion(true)
	update_route_ribbon(true)
	info.text = "Walking to street point (%.1f, %.1f) m · %.1f m\nCollision route outside %d city footprints\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [safe_goal.x, safe_goal.y, player_xz().distance_to(safe_goal), data.buildings.size()]
	announce_a11y_status("Walking to street point (%.1f, %.1f) m." % [safe_goal.x, safe_goal.y])
	return true

## Five conversation turns per neighbor, before and after the block opens. Lines describe game
## mechanics or facts already in the data (Compton's plaque at Turk & Taylor, the Black Hawk at
## Turk & Hyde 1949-63, Boeddeker Park's direction computed from the OSM outline).
func neighbor_lines(n_id: String) -> Array[String]:
	match n_id:
		"bea":
			if block_opened:
				return [
					"Bea: \"Look at Turk Street come alive! Let's take a group photo, plan our party schedule, or hold our tenant listening circle.\"",
					"Bea: \"Tap 'Plan Party Schedule' to line up stories, rhythm, shared art tiles, and a quiet pause for the block.\"",
					"Bea: \"Every neighbor's voice belongs here at Turk & Taylor. Have you read the 1966 Compton's plaque on the corner?\"",
					"Bea: \"Thanks for showing up for the block. That's all a party really is: neighbors deciding to be here for each other.\"",
					"Bea: \"If you lose track of the afternoon, tap What's Next?—or press Shift+D to spot the small cutesy dinosaur by Boeddeker Park and the wild woman chef on a magic carpet!\""
				]
			return [
				"Bea: \"Welcome to Turk & Taylor! Greet all 5 neighbors, add 3 mural motifs, and run Rook's soundcheck to open our block.\"",
				"Bea: \"I've got the signboard ready by my rollator. Tap Go Meet below and I'll point you to the next neighbor.\"",
				"Bea: \"Once all 5 of us have met, Celeste's easel is painted, and Rook's speaker is checked, tap 'Open Block Party!' right below.\"",
				"Bea: \"Boeddeker Park is %s, if you ever want a bench and some trees.\"" % compass_phrase(neighbor_xz(0), BOEDDEKER_PARK_ENTRANCE),
				"Bea: \"Lost? Tap What's Next? any time—or press Shift+D if you hear rumors of a small cutesy dinosaur or a wild woman chef on a magic carpet!\""
			]
		"dez":
			if block_opened:
				return [
					"Dez: \"The block party is jumping! Tap 'Plan Party Schedule' or 'Shoot Short Film' to work on our afternoon projects.\"",
					"Dez: \"During the rhythm workshop we can toggle an 8-step beat pattern right from the sidewalk, and playing quiet always counts too.\"",
					"Dez: \"If you stroll out west to Dodge Alley or Turk & Hyde, you can feel that classic Tenderloin jazz history in the air.\"",
					"Dez: \"Celeste and I want to make a little three-shot film. Ask me when you're ready.\"",
					"Dez: \"Thanks for keeping the tempo easy—and if you spot that random guy on a dirt bike in a Viking helmet or Jeffrey's lost 1961 record by 361 Turk, press Shift+D!\""
				]
			return [
				"Dez: \"80 BPM pocket is locked in near Mason. Use the conversation actions below to meet anyone left or get our block party rolling!\"",
				"Dez: \"Have you chatted with Rook by the Turk Street speaker yet? Every neighbor you meet and motif you paint unlocks another layer of the groove.\"",
				"Dez: \"Paint with Celeste, soundcheck with Rook, or take a walk west to the Black Hawk jazz site at Turk & Hyde!\"",
				"Dez: \"I keep the groove at 80 BPM so nobody has to shout over it.\"",
				"Dez: \"The Black Hawk at Turk & Hyde had jazz from 1949 to 1963—and rumor has it Jeffrey's lost 1961 record and a guy on a dirt bike in a Viking helmet are out along Turk (Shift+D)!\""
			]
		"thanh":
			if block_opened:
				return [
					"Thanh: \"Pull up a stool and pour some hot jasmine tea! We can snap a group photo, host the party schedule, or hold our tenant circle.\"",
					"Thanh: \"Whenever the afternoon winds down, tap 'Pack Borrowed Gear' and we'll return the folding table, paint case, and speaker.\"",
					"Thanh: \"I love seeing the sidewalk stay clear for neighbors passing through while we share stories around the long table.\"",
					"Thanh: \"More jasmine tea? There's plenty.\"",
					"Thanh: \"When everyone's ready, we pack up together—and don't miss the surprise drag show, bite-sized bags of nachos, fresh donut & bagel, clown horn walker, or the impromptu Mayor Public Event (Shift+D)!\""
				]
			return [
				"Thanh: \"Hot tea and folding stools are stacked on Taylor Street. Once all 5 neighbors, the mural, and the soundcheck are ready, we open the block party!\"",
				"Thanh: \"Celeste has her portable mural easel set up on Turk Street, and Rook is testing the sidewalk speaker just down the block.\"",
				"Thanh: \"Tap any action below to meet the rest of the block. We're keeping the through-route clear for everyone on Taylor and Turk.\"",
				"Thanh: \"The folding table is mine. Borrow it for the party, and we'll carry it back together when we pack up.\"",
				"Thanh: \"Bea taught me to keep the sidewalk wide enough for walkers, strollers, bite-sized nachos, a good donut or bagel, a guy with a clown horn, and even an impromptu Mayor Public Event (Shift+D)!\""
			]
	return []

func neighbor_greeting_line(n_id: String) -> String:
	var options := neighbor_lines(n_id)
	var memory := layout_memory_line(n_id) if block_opened else ""
	if not memory.is_empty() and options.size() >= 4:
		options[3] = memory
	var surp_mem := neighbor_surprise_memory_line(n_id)
	if not surp_mem.is_empty() and options.size() >= 5:
		var speaker_name := n_id.capitalize()
		for nb in neighbors:
			if String(nb.get("id", "")) == n_id:
				speaker_name = String(nb.get("name", speaker_name))
				break
		options[4] = "%s: \"%s\"" % [speaker_name, surp_mem.trim_prefix("“").trim_suffix("”")]
	if options.is_empty():
		return "Choose a conversation topic or neighborhood action below"
	return options[posmod(maxi(1, int(neighbor_talk_counts.get(n_id, 1))) - 1, options.size())]

func talk_with_neighbor(index: int) -> String:
	if index < 0 or index >= neighbors.size():
		return ""
	if index == celeste_index:
		return talk_with_celeste()
	if index == rook_index:
		return check_sound_with_rook()
	var n: Dictionary = neighbors[index]
	var n_id := String(n.get("id", ""))
	var first_visit := not visited_neighbors.has(n_id)
	var turn_cnt := int(neighbor_talk_counts.get(n_id, 0)) + 1
	neighbor_talk_counts[n_id] = turn_cnt
	visited_neighbors[n_id] = true
	browser_import_message = ""
	last_panel_dialogue = ""
	recompute_music_stems()
	update_block_3d()
	show_conversation(index)
	var prev_sup := suppress_feel_good_burst
	suppress_feel_good_burst = prev_sup or (not first_visit)
	trigger_progress_cue("neighbor_visit", n.name)
	suppress_feel_good_burst = prev_sup
	var line := neighbor_greeting_line(n_id)
	show_neighbor_speech(index, line)
	var mem_line := neighbor_memory_tail(n_id, line, turn_cnt)
	var sub_b := mem_line if not mem_line.is_empty() else ("Talking with %s (%s) · Click %s again or choose an action below" % [n.name, n.role, n.name])
	info.text = "%s\n%s\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [line, sub_b]
	announce_a11y_status(line if mem_line.is_empty() else ("%s %s" % [line, mem_line]))
	return line

func finish_neighbor_arrival(index: int) -> void:
	var n: Dictionary = neighbors[index]
	var goal := neighbor_xz(index)
	var cur := player_xz()
	var dist := cur.distance_to(goal)
	if dist < 0.85:
		var away := (cur - goal).normalized() if dist > 1e-4 else -nearest_street_tangent(goal)
		var stand_pos := goal + away * 0.95
		if is_walkable_point(stand_pos):
			player.position = Vector3(stand_pos.x, 0.0, stand_pos.y)
	cur = player_xz()
	var to_n := goal - cur
	if player_visual != null and to_n.length_squared() > 1e-4:
		player_visual.rotation.y = atan2(to_n.x, to_n.y)
	if index >= 0 and index < neighbor_nodes.size() and neighbor_nodes[index] != null and to_n.length_squared() > 1e-4:
		neighbor_nodes[index].rotation.y = atan2(-to_n.x, -to_n.y)
	current_path.clear()
	arrived_neighbor = index
	walking_to_mural = false
	arrived_mural = false
	walking_to_speaker = false
	arrived_speaker = false
	walking_to_history_stop = ""
	arrived_history_stop = ""
	last_panel_dialogue = ""
	var n_id := String(n.get("id", ""))
	if not n_id.is_empty() and int(neighbor_talk_counts.get(n_id, 0)) == 0:
		neighbor_talk_counts[n_id] = 1
	var newly_visited := false
	if not n_id.is_empty() and not visited_neighbors.has(n_id):
		visited_neighbors[n_id] = true
		newly_visited = true
		browser_import_message = ""
	recompute_music_stems()
	update_block_3d()
	update_block_ui()
	var prev_sup_arr := suppress_feel_good_burst
	suppress_feel_good_burst = prev_sup_arr or (not newly_visited)
	trigger_progress_cue("neighbor_visit", n.name)
	suppress_feel_good_burst = prev_sup_arr
	update_route_ribbon(true)
	if following_player:
		target = Vector3(player.position.x, 1.0, player.position.z)
		update_camera()
	update_occlusion(true)
	if index == celeste_index:
		pending_rook_talk = false
		var trigger_talk := pending_celeste_talk
		pending_celeste_talk = false
		if trigger_talk:
			talk_with_celeste()
			return
		if celeste_talk_count == 0:
			celeste_talk_count = 1
			recompute_music_stems()
			save_godot_state()
		elif newly_visited:
			save_godot_state()
		show_mural_panel(true)
		var c_arr_line := celeste_dialogue_text()
		show_neighbor_speech(index, c_arr_line)
		var mem_c_arr := neighbor_memory_tail(n_id, c_arr_line, celeste_talk_count)
		var mem_c_a11y := (" " + mem_c_arr) if not mem_c_arr.is_empty() else ""
		var sub_c := mem_c_arr if not mem_c_arr.is_empty() else "Portable sidewalk easel ready · Place Sun, Wave & Rise below"
		info.text = "With %s — %s · %d/3 mural motifs\n%s\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [n.name, n.role, mural_placements.size(), sub_c]
		announce_a11y_status("Arrived at %s (%s). Portable Mural Board %d/3 motifs.%s" % [n.name, n.role, mural_placements.size(), mem_c_a11y])
	elif index == rook_index:
		pending_celeste_talk = false
		var trigger_rook := pending_rook_talk
		pending_rook_talk = false
		if trigger_rook:
			check_sound_with_rook()
			return
		if newly_visited:
			save_godot_state()
		show_music_panel(true)
		var r_arr_line := rook_dialogue_text()
		show_neighbor_speech(index, r_arr_line)
		var mem_r_arr := neighbor_memory_tail(n_id, r_arr_line, rook_talk_count)
		var mem_r_a11y := (" " + mem_r_arr) if not mem_r_arr.is_empty() else ""
		var sc_tag := "Soundcheck ready" if rook_soundcheck_done else "Tap Soundcheck below"
		var sub_r := mem_r_arr if not mem_r_arr.is_empty() else ("Turk St speaker %.1f m clear of wall · Explicit play/audition below" % min_wall_distance(speaker_xz()))
		info.text = "With %s — %s · %s\n%s\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [n.name, n.role, sc_tag, sub_r]
		announce_a11y_status("Arrived at %s (%s). %s.%s" % [n.name, n.role, sc_tag, mem_r_a11y])
	else:
		pending_celeste_talk = false
		pending_rook_talk = false
		if newly_visited:
			save_godot_state()
		show_conversation(index)
		var b_arr_line := neighbor_greeting_line(n_id)
		show_neighbor_speech(index, b_arr_line)
		var mem_b_arr := neighbor_memory_tail(n_id, b_arr_line, int(neighbor_talk_counts.get(n_id, 1)))
		var mem_b_a11y := (" " + mem_b_arr) if not mem_b_arr.is_empty() else ""
		var sub_b := mem_b_arr if not mem_b_arr.is_empty() else b_arr_line
		info.text = "With %s — %s · %d/5 neighbors met\n%s\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [n.name, n.role, visited_neighbors.size(), sub_b]
		announce_a11y_status("Arrived at %s (%s). Visited %d/5 neighbors.%s" % [n.name, n.role, visited_neighbors.size(), mem_b_a11y])

func finish_mural_arrival() -> void:
	var stand_pt := mural_stand_xz()
	var cur := player_xz()
	if is_point_in_mural_footprint(cur, PLAYER_RADIUS_M) or cur.distance_to(stand_pt) > 0.65:
		if is_walkable_point(stand_pt):
			player.position = Vector3(stand_pt.x, 0.0, stand_pt.y)
	current_path.clear()
	walking_to_mural = false
	arrived_mural = true
	walking_to_speaker = false
	arrived_speaker = false
	walking_to_history_stop = ""
	arrived_history_stop = ""
	arrived_neighbor = -1
	pending_rook_talk = false
	var trigger_talk := pending_celeste_talk
	pending_celeste_talk = false
	update_route_ribbon(true)
	if following_player:
		target = Vector3(player.position.x, 1.0, player.position.z)
		update_camera()
	update_occlusion(true)
	if trigger_talk:
		talk_with_celeste()
		return
	if celeste_talk_count == 0:
		celeste_talk_count = 1
		recompute_music_stems()
		save_godot_state()
	show_mural_panel(true)
	update_mural_ui()
	info.text = "At Celeste's portable mural board · %d/3 motifs · %s palette\nA freestanding sidewalk easel: no building façade is painted\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [mural_placements.size(), mural_palette.capitalize()]
	announce_a11y_status("At Portable Mural Board with Celeste (%d/3 motifs, %s palette)." % [mural_placements.size(), mural_palette.capitalize()])

func finish_speaker_arrival() -> void:
	var stand_pt := speaker_stand_xz()
	var cur := player_xz()
	if is_point_in_speaker_footprint(cur, PLAYER_RADIUS_M) or cur.distance_to(stand_pt) > 0.65:
		if is_walkable_point(stand_pt):
			player.position = Vector3(stand_pt.x, 0.0, stand_pt.y)
	current_path.clear()
	walking_to_speaker = false
	arrived_speaker = true
	walking_to_mural = false
	arrived_mural = false
	walking_to_history_stop = ""
	arrived_history_stop = ""
	arrived_neighbor = -1
	pending_celeste_talk = false
	var trigger_rook := pending_rook_talk
	pending_rook_talk = false
	update_route_ribbon(true)
	if following_player:
		target = Vector3(player.position.x, 1.0, player.position.z)
		update_camera()
	update_occlusion(true)
	if trigger_rook:
		check_sound_with_rook()
		return
	show_music_panel(true)
	update_music_ui()
	var sc_tag := active_stem_summary() if rook_soundcheck_done else "Tap Soundcheck below"
	info.text = "At Rook's Turk Street speaker · %s\nPlay the sketch or audition your own local track (never uploaded)\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % sc_tag
	announce_a11y_status("At Rook's Turk Street Speaker (%s)." % sc_tag)

func celeste_dialogue_text() -> String:
	var c_surp := neighbor_surprise_memory_line(CELESTE_ID)
	if mural_completed:
		var completed_options: Array[String] = [
			"Celeste: \"Sun, Wave, and Rise are up on our portable board. We made something together without painting anyone's building.\"",
			"Celeste: \"Try cycling Garden, Sunset, or Ocean palettes anytime—even after the board is complete, the colors shift on the easel and in our keepsake.\"",
			"Celeste: \"Once the block gathering opens, we can host the shared six-tile art panel and help Dez frame our three-shot short film, The Open Seat.\"",
			"Celeste: \"I love how our freestanding board keeps the Turk Street sidewalk wide open while giving the block a shared canvas.\"",
			"Celeste: \"Have you walked over to 145 Leavenworth or Boeddeker Park yet? Press Shift+D to spot the hidden mural alcove and Pip the Tiny Dino!\""
		]
		var c_lay_mem := layout_memory_line(CELESTE_ID) if block_opened else ""
		if not c_lay_mem.is_empty():
			completed_options[3] = c_lay_mem
		if not c_surp.is_empty():
			completed_options[4] = "Celeste: \"%s\"" % c_surp.trim_prefix("“").trim_suffix("”")
		return completed_options[posmod(maxi(1, celeste_talk_count) - 1, completed_options.size())]
	var options: Array[String] = [
		"Celeste: \"Welcome to my easel! Add Sun, Wave, and Rise with the buttons below.\"",
		"Celeste: \"Try Garden, Sunset, or Ocean, or tap Shift Motif to slide your shape around the 6×3 board.\"",
		"Celeste: \"It's a freestanding sidewalk board, so no wall gets painted and nobody's facade changes.\"",
		"Celeste: \"There's no wrong spot for a shape. Put it where it feels right to you.\"",
		"Celeste: \"When the board is finished, Rook's groove gets another layer—and if you walk over to 145 Leavenworth, look for the hidden mural alcove below the 8th floor (Shift+D)!\""
	]
	if not c_surp.is_empty():
		options[4] = "Celeste: \"%s\"" % c_surp.trim_prefix("“").trim_suffix("”")
	return options[posmod(maxi(1, celeste_talk_count) - 1, options.size())]

func rook_dialogue_text() -> String:
	if music_mode == "local" and not local_music_name.is_empty():
		return "Rook: \"Spinning your local cut (%s) on the Turk Street speaker. It stays in this tab and is never uploaded.\"" % local_music_name
	var r_surp := neighbor_surprise_memory_line(ROOK_ID)
	if mural_completed:
		var completed_options: Array[String] = [
			"Rook: \"Celeste's finished mural unlocked the last layer. The full 4-part 80 BPM sketch is ready: hit Play Groove or load your own track.\"",
			"Rook: \"Hear how bass, brush, chords, and lead lock together at 80 BPM? You can cycle volume or pause anytime—the block party stays sound-independent.\"",
			"Rook: \"During the afternoon schedule and the tenant listening circle, I keep the speaker gentle so every neighbor on Turk Street is heard.\"",
			"Rook: \"I'll stay off camera when you snap the keepsake photo and shoot The Open Seat, but I'm right here on the sound cue.\"",
			"Rook: \"If you walk out toward 361 Turk or Jones & Turk, press Shift+D—Jeffrey's lost 1961 LP and Honker Barnaby are right in pocket with our groove!\""
		]
		var r_lay_mem := layout_memory_line(ROOK_ID) if block_opened else ""
		if not r_lay_mem.is_empty():
			completed_options[3] = r_lay_mem
		if not r_surp.is_empty():
			completed_options[4] = "Rook: \"%s\"" % r_surp.trim_prefix("“").trim_suffix("”")
		return completed_options[posmod(maxi(1, rook_talk_count) - 1, completed_options.size())]
	var options: Array[String] = [
		"Rook: \"Speaker's set up on the sidewalk and the soundcheck is done (%s).\"" % active_stem_summary(),
		"Rook: \"Every neighbor you meet and motif you paint unlocks another layer: bass, brushes, chords, then lead.\"",
		"Rook: \"We can keep the street quiet or play the groove. The party works either way.\"",
		"Rook: \"I'd rather stay off camera, but I'll always run the sound.\"",
		"Rook: \"If you load your own track, it stays in this browser tab. Nothing gets uploaded.\""
	]
	if not r_surp.is_empty():
		options[4] = "Rook: \"%s\"" % r_surp.trim_prefix("“").trim_suffix("”")
	return options[posmod(maxi(1, rook_talk_count) - 1, options.size())]

func focus_mural_camera() -> void:
	in_overview = false
	in_wide_overview = false
	following_player = false
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
		selected = -1
	var c_pos: Vector3 = neighbors[celeste_index].pos
	target = Vector3((c_pos.x + MURAL_POS.x) * 0.5, 1.4, (c_pos.z + MURAL_POS.z) * 0.5)
	view_size = 45.0
	update_camera()
	frame_activity_camera(mural_panel)
	update_occlusion(true)

func focus_speaker_camera() -> void:
	in_overview = false
	in_wide_overview = false
	following_player = false
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
		selected = -1
	var r_pos: Vector3 = neighbors[rook_index].pos
	target = Vector3((r_pos.x + ROOK_SPEAKER_POS.x) * 0.5, 1.2, (r_pos.z + ROOK_SPEAKER_POS.z) * 0.5)
	view_size = 45.0
	update_camera()
	frame_activity_camera(music_panel)
	update_occlusion(true)

func frame_activity_camera(panel: Control) -> void:
	if panel == null:
		return
	layout_walking_controls_and_hub()
	# Hidden-focus-show callers finish framing synchronously when the panel opens.
	remember_panel_framing(panel, target)
	refit_panel_camera()

func panel_camera_pose() -> Array:
	return [target, view_size, camera_yaw, camera_pitch_scale]

func remember_panel_framing(panel: Control, subject: Vector3) -> void:
	panel_frame_control = panel
	panel_frame_subject = subject
	panel_frame_pose = panel_camera_pose()

func refit_panel_after_layout() -> void:
	panel_refit_generation += 1
	var generation := panel_refit_generation
	await get_tree().process_frame
	await get_tree().process_frame
	if generation == panel_refit_generation:
		refit_panel_camera()

func refit_panel_camera() -> void:
	# A changed pose means the player inspected, panned, rotated, zoomed or walked.
	if panel_frame_control == null or not panel_frame_control.visible or (panel_frame_control == block_panel and block_panel_mode != "talk") or panel_frame_pose != panel_camera_pose() or in_overview or in_wide_overview:
		return
	var area := play_area_rect()
	var want := area.get_center()
	if panel_frame_control == block_panel and talk_partner >= 0:
		panel_frame_subject.y = 1.0 if uses_compact_activity_controls() else 2.2
	if panel_frame_control == block_panel and not uses_compact_activity_controls():
		want.y = area.position.y + area.size.y * 0.66
	pan_camera_by_screen_delta(want - camera.unproject_position(panel_frame_subject))
	if uses_compact_activity_controls() and player.position.distance_to(panel_frame_subject) < 12.0:
		var body := player_overlay_rect()
		var safe := area.grow(-4.0)
		if body.has_area():
			var desired := body.position
			desired.x = clampf(desired.x, safe.position.x, safe.end.x - body.size.x) if body.size.x <= safe.size.x else safe.get_center().x - body.size.x * 0.5
			desired.y = clampf(desired.y, safe.position.y, safe.end.y - body.size.y) if body.size.y <= safe.size.y else safe.get_center().y - body.size.y * 0.5
			pan_camera_by_screen_delta(desired - body.position)
	panel_frame_pose = panel_camera_pose()
	update_occlusion(true)

func focus_block_camera() -> void:
	in_overview = false
	in_wide_overview = false
	following_player = false
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
		selected = -1
	var b_pos: Vector3 = neighbors[0].pos
	target = Vector3(b_pos.x, 1.35, b_pos.z)
	view_size = 45.0
	update_camera()
	if get_viewport() != null and is_narrow_layout():
		target -= camera.global_basis.y * 4.2
		update_camera()
	update_occlusion(true)

func talk_with_celeste() -> String:
	celeste_talk_count += 1
	visited_neighbors[CELESTE_ID] = true
	browser_import_message = ""
	last_panel_dialogue = ""
	recompute_music_stems()
	update_block_3d()
	focus_mural_camera()
	save_godot_state()
	var prev_sup_cel := suppress_feel_good_burst
	suppress_feel_good_burst = prev_sup_cel or (celeste_talk_count != 1)
	trigger_progress_cue("celeste_talk", "Celeste talk")
	suppress_feel_good_burst = prev_sup_cel
	show_mural_panel(true)
	update_block_ui()
	var line := celeste_dialogue_text()
	show_neighbor_speech(celeste_index, line)
	var mem_c := neighbor_memory_tail(CELESTE_ID, line, celeste_talk_count)
	var sub_c := mem_c if not mem_c.is_empty() else ("Portable Mural Board: %d/3 motifs (%s palette) · Separate Godot save" % [mural_placements.size(), mural_palette.capitalize()])
	info.text = "%s\n%s\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [line, sub_c]
	announce_a11y_status(line if mem_c.is_empty() else ("%s %s" % [line, mem_c]))
	return line

func request_rook_soundcheck() -> bool:
	if arrived_neighbor == rook_index or arrived_speaker:
		check_sound_with_rook()
		return true
	if not current_path.is_empty() and (selected_neighbor == rook_index or walking_to_speaker):
		pending_rook_talk = true
		return true
	if walk_to_neighbor(rook_index):
		if arrived_neighbor == rook_index:
			check_sound_with_rook()
		else:
			pending_rook_talk = true
		return true
	return false

func check_sound_with_rook() -> String:
	var was_sc_done := rook_soundcheck_done
	rook_talk_count += 1
	visited_neighbors[ROOK_ID] = true
	rook_soundcheck_done = true
	browser_import_message = ""
	last_panel_dialogue = ""
	recompute_music_stems()
	update_speaker_3d()
	update_block_3d()
	focus_speaker_camera()
	save_godot_state()
	var prev_sup_rook := suppress_feel_good_burst
	suppress_feel_good_burst = prev_sup_rook or was_sc_done
	trigger_progress_cue("rook_soundcheck", "Rook soundcheck")
	suppress_feel_good_burst = prev_sup_rook
	show_music_panel(true)
	update_block_ui()
	var line := rook_dialogue_text()
	show_neighbor_speech(rook_index, line)
	var mem_r := neighbor_memory_tail(ROOK_ID, line, rook_talk_count)
	var sub_r := mem_r if not mem_r.is_empty() else ("Rook's Speaker: %s · Explicit Play/Pause & local Suno audition" % active_stem_summary())
	info.text = "%s\n%s\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [line, sub_r]
	announce_a11y_status(line if mem_r.is_empty() else ("%s %s" % [line, mem_r]))
	return line

func is_block_ready() -> bool:
	return visited_neighbors.size() >= neighbors.size() and mural_placements.size() == MURAL_MOTIFS.size() and rook_soundcheck_done

func get_block_missing_summary() -> String:
	var missing: Array[String] = []
	if visited_neighbors.size() < neighbors.size():
		missing.append("%d/5 neighbors" % visited_neighbors.size())
	if mural_placements.size() < MURAL_MOTIFS.size():
		missing.append("%d/3 mural motifs" % mural_placements.size())
	if not rook_soundcheck_done:
		missing.append("Rook soundcheck")
	if missing.is_empty():
		return "Ready to open"
	return ", ".join(missing)

func visit_next_unvisited_neighbor() -> bool:
	for i in range(neighbors.size()):
		var nid := String(neighbors[i].get("id", ""))
		if not visited_neighbors.has(nid):
			return walk_to_neighbor(i)
	return choose_next_neighbor(1)

func open_mural_from_block_panel() -> void:
	if arrived_neighbor == celeste_index or arrived_mural:
		show_mural_panel(true)
		focus_mural_camera()
	else:
		walk_to_mural()

func open_block_gathering() -> bool:
	if not is_block_ready():
		show_block_panel(true)
		var missing := get_block_missing_summary()
		last_panel_dialogue = "Bea: \"Almost ready to open the block party! We just need: %s.\"" % missing
		info.text = "Turk St block gathering needs: %s\nVisit all 5 neighbors (1–5), place 3/3 mural motifs (M), and soundcheck with Rook (R)\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % missing
		update_block_ui()
		announce_a11y_status("Block gathering needs: %s." % missing)
		return false
	if block_opened:
		show_block_panel(true)
		focus_block_camera()
		last_panel_dialogue = "Bea: \"Our Turk Street block party is open! Pick an activity below—photo, schedule, tenant circle, or short film.\""
		update_block_ui()
		announce_a11y_status("Block gathering already open.")
		return true
	if not (gathering_layout in GATHERING_LAYOUTS):
		gathering_layout = "table"
		if String(keepsake_photo.get("status", "unasked")) == "unasked":
			keepsake_photo["layout"] = "table"
	block_opened = true
	browser_import_message = ""
	var line := "Bea: \"Everyone's here, Celeste's 3/3 board is glowing, and Rook's speaker is set. Our Turk Street block gathering is open, %s style!\"" % String(GATHERING_LAYOUT_TITLES[gathering_layout])
	last_panel_dialogue = line
	update_block_3d()
	show_block_panel(true)
	focus_block_camera()
	save_godot_state()
	trigger_progress_cue("block_opened", "Turk St Gathering")
	update_block_ui()
	info.text = "%s\nOpening Block Complete (5/5 neighbors · 3/3 mural · Soundcheck ready · Sound-independent)\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % line
	announce_a11y_status(line)
	return true

func default_keepsake_photo() -> Dictionary:
	return {"status": "unasked", "participants": [], "mural": {}, "palette": "garden", "layout": "table"}

func default_hosting_draft() -> Dictionary:
	return {"story": "memory", "pattern": 85, "tiles": [0, 1, 2, 2, 1, 0], "palette": "warm", "quiet": "arc"}

func take_keepsake_photo(participants: Array = PHOTO_GUESTS) -> bool:
	if not block_opened or epilogue_packing or String(keepsake_photo.get("status", "unasked")) == "taken":
		return false
	if mural_placements.size() < MURAL_MOTIFS.size() or participants.is_empty():
		return false
	for raw_p in participants:
		if not (raw_p is String) or not (String(raw_p) in PHOTO_GUESTS):
			return false
	var canonical: Array[String] = []
	for guest_id in PHOTO_GUESTS:
		if participants.has(guest_id):
			canonical.append(guest_id)
	if canonical.is_empty():
		return false
	var frozen_mural: Dictionary = {}
	for m_id in MURAL_MOTIFS:
		var cell: Dictionary = mural_placements[m_id]
		frozen_mural[m_id] = {"col": int(cell.get("col", 0)), "row": int(cell.get("row", 0))}
	var cur_layout := String(keepsake_photo.get("layout", "table"))
	keepsake_photo = {
		"status": "taken",
		"participants": canonical,
		"mural": frozen_mural,
		"palette": mural_palette,
		"layout": cur_layout if cur_layout in ["table", "floor"] else "table"
	}
	browser_import_message = ""
	update_block_3d()
	save_godot_state()
	trigger_progress_cue("keepsake_photo", "%d guests" % canonical.size())
	update_block_ui()
	var guest_names: Array[String] = []
	for g_id in canonical:
		guest_names.append(g_id.capitalize())
	var summary := "Keepsake photo taken with %s (%s mural frozen · Rook declines without penalty)" % [", ".join(guest_names), mural_palette.capitalize()]
	info.text = "%s\nM1 Afternoon Keepsake · Press Y to pack & return neighbor loans\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return true

func skip_keepsake_photo() -> bool:
	if not block_opened or epilogue_packing or String(keepsake_photo.get("status", "unasked")) != "unasked":
		return false
	var cur_layout := String(keepsake_photo.get("layout", "table"))
	keepsake_photo = {
		"status": "skipped",
		"participants": [],
		"mural": {},
		"palette": mural_palette,
		"layout": cur_layout if cur_layout in ["table", "floor"] else "table"
	}
	browser_import_message = ""
	update_block_3d()
	save_godot_state()
	update_block_ui()
	var summary := "Keepsake photo skipped for now (can still take photo before packing starts)."
	info.text = "%s\nM1 Afternoon Keepsake · Press Y to start packing neighbor loans\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return true

func start_packing_epilogue() -> bool:
	if not block_opened:
		return false
	if not epilogue_packing:
		epilogue_packing = true
		if String(keepsake_photo.get("status", "unasked")) == "unasked":
			var cur_layout := String(keepsake_photo.get("layout", "table"))
			keepsake_photo = {
				"status": "skipped",
				"participants": [],
				"mural": {},
				"palette": mural_palette,
				"layout": cur_layout if cur_layout in ["table", "floor"] else "table"
			}
	browser_import_message = ""
	update_block_3d()
	save_godot_state()
	trigger_progress_cue("epilogue_packing", "Packing loans")
	update_block_ui()
	var summary := "Started packing borrowed neighbor gear (%d/3 loans returned)." % epilogue_returned.size()
	info.text = "%s\nReturn Thanh's folding table, Celeste's paint case, and Rook's speaker (Y)\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return true

func return_loan(loan_id: String) -> bool:
	if not block_opened or not epilogue_packing or not (loan_id in LOAN_IDS):
		return false
	if epilogue_returned.has(loan_id):
		return false
	var next_returned: Array[String] = []
	for lid in LOAN_IDS:
		if lid == loan_id or epilogue_returned.has(lid):
			next_returned.append(lid)
	epilogue_returned = next_returned
	browser_import_message = ""
	update_block_3d()
	save_godot_state()
	trigger_progress_cue("loan_returned", loan_id)
	update_block_ui()
	var title := String(LOAN_TITLES.get(loan_id, loan_id))
	var summary := "Returned %s (%d/3 loans returned)%s" % [title, epilogue_returned.size(), " — Afternoon Epilogue Complete!" if is_epilogue_done() else ""]
	info.text = "%s\nM1 Afternoon Keepsake & Loan Returns · Sound-independent\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return true

func return_next_loan() -> String:
	if not block_opened:
		return ""
	if not epilogue_packing:
		start_packing_epilogue()
	for lid in LOAN_IDS:
		if not epilogue_returned.has(lid):
			if return_loan(lid):
				return lid
	return ""

func is_epilogue_done() -> bool:
	return block_opened and epilogue_packing and epilogue_returned.size() == LOAN_IDS.size()

func advance_epilogue_step() -> String:
	show_block_panel(true)
	if not block_opened:
		var msg := "Open the Turk Street block gathering (O) before taking the keepsake photo or returning loans."
		last_panel_dialogue = "Thanh: \"Let's open the Turk Street block party first (%s)—then we'll take our group photo and pack borrowed gear!\"" % get_block_missing_summary()
		update_block_ui()
		info.text = "%s\nVisit all 5 neighbors, complete 3/3 mural motifs, and soundcheck with Rook\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % msg
		announce_a11y_status(msg)
		return "locked"
	if String(keepsake_photo.get("status", "unasked")) == "unasked" and not epilogue_packing:
		var ok_ph := take_keepsake_photo(PHOTO_GUESTS)
		if ok_ph:
			last_panel_dialogue = "Celeste: \"Group photo snapped by the 3/3 mural! Tap 'Pack Borrowed Gear' whenever we're ready to wrap up.\""
			update_block_ui()
		return "photo_taken" if ok_ph else "photo_blocked"
	if not epilogue_packing:
		var ok_pk := start_packing_epilogue()
		if ok_pk:
			last_panel_dialogue = "Thanh: \"Let's pack up our borrowed gear—tap 'Return Gear' to return the table, paint case, and speaker.\""
			update_block_ui()
		return "packing_started" if ok_pk else "packing_blocked"
	if epilogue_returned.size() < LOAN_IDS.size():
		var lid := return_next_loan()
		if not lid.is_empty():
			last_panel_dialogue = "Thanh: \"Returned %s (%d/3 gear items back home)!\"" % [String(LOAN_TITLES.get(lid, lid)), epilogue_returned.size()]
			update_block_ui()
		return ("returned_" + lid) if not lid.is_empty() else "loan_blocked"
	var kp_status := String(keepsake_photo.get("status", "skipped"))
	var done_msg := "Afternoon epilogue complete: keepsake %s and 3/3 neighbor loans returned." % kp_status
	last_panel_dialogue = "Thanh: \"All 3 borrowed items are returned and our afternoon keepsake is %s!\"" % kp_status
	update_block_ui()
	var export_hint := " (Shift+Y exports keepsake SVG)" if kp_status == "taken" else ""
	info.text = "%s\nUse Z to plan & host the Second Afternoon Programme%s\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [done_msg, export_hint]
	announce_a11y_status(done_msg)
	return "epilogue_complete"

func xml_escape(raw_val: String) -> String:
	return raw_val.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&apos;")

func build_keepsake_svg(photo_dict: Dictionary = {}) -> String:
	var src: Dictionary = keepsake_photo if photo_dict.is_empty() else photo_dict
	if String(src.get("status", "")) != "taken":
		return ""
	var p_val: Variant = src.get("participants", null)
	if not (p_val is Array) or (p_val as Array).is_empty():
		return ""
	var seen_p: Dictionary = {}
	for raw_id in (p_val as Array):
		if not (raw_id is String):
			return ""
		var gid := String(raw_id)
		if not (gid in PHOTO_GUESTS) or seen_p.has(gid):
			return ""
		seen_p[gid] = true
	var pal_id := String(src.get("palette", ""))
	var lay_id := String(src.get("layout", ""))
	if not (pal_id in MURAL_PALETTES) or not (lay_id in ["table", "floor"]):
		return ""
	var m_check := validate_mural_dict(src.get("mural", null), true)
	if not bool(m_check.get("ok", false)):
		return ""
	var clean_mural: Dictionary = m_check.get("placements", {})
	var colors: Array = KEEPSAKE_PALETTE_HEX.get(pal_id, KEEPSAKE_PALETTE_HEX["garden"])
	var motifs_svg := ""
	for i in range(MURAL_MOTIFS.size()):
		var mid := MURAL_MOTIFS[i]
		var cell: Dictionary = clean_mural[mid]
		var mx := 135 + int(cell.get("col", 0)) * 68
		var my := 155 + int(cell.get("row", 0)) * 43
		var m_col := String(colors[i])
		if mid == "sun":
			motifs_svg += "<g transform=\"translate(%d %d)\" stroke=\"%s\" stroke-width=\"5\" stroke-linecap=\"round\"><path d=\"M-15 0h30M0-15v30M-11-11l22 22M-11 11l22-22\"/></g>" % [mx, my, m_col]
		elif mid == "wave":
			motifs_svg += "<path d=\"M%d %dq12-17 24 0t24 0M%d %dq12-17 24 0t24 0\" stroke=\"%s\" stroke-width=\"4\" fill=\"none\"/>" % [mx - 23, my, mx - 23, my + 11, m_col]
		else:
			motifs_svg += "<text x=\"%d\" y=\"%d\" text-anchor=\"middle\" font-family=\"Georgia,serif\" font-size=\"24\" fill=\"%s\">RISE</text>" % [mx, my + 6, m_col]
	var guest_meta: Dictionary = {
		"bea": {"name": "Bea", "coat": "#c5874f", "skin": "#966345", "hair": "#dad7c6", "rollator": true, "headphones": false},
		"celeste": {"name": "Celeste", "coat": "#c87d82", "skin": "#8b5b3f", "hair": "#383c32", "rollator": false, "headphones": false},
		"dez": {"name": "Dez", "coat": "#978aaf", "skin": "#704b37", "hair": "#292f2b", "rollator": false, "headphones": true},
		"thanh": {"name": "Thanh", "coat": "#b59b5d", "skin": "#c38c65", "hair": "#454236", "rollator": false, "headphones": false}
	}
	var guests: Array[String] = []
	var guest_names: Array[String] = []
	for gid in PHOTO_GUESTS:
		if seen_p.has(gid):
			guests.append(gid)
			guest_names.append(String(guest_meta[gid]["name"]))
	var people_svg := ""
	for i in range(guests.size()):
		var gid := guests[i]
		var gm: Dictionary = guest_meta[gid]
		var gx := 320 + i * 106 - (guests.size() - 1) * 53
		var walker := "<g stroke=\"#496557\" stroke-width=\"4\" fill=\"none\"><path d=\"M-31 10l-8 39h68l-6-39\"/><path d=\"M-35 33h61\"/></g><circle cx=\"-37\" cy=\"52\" r=\"5\" fill=\"#496557\"/><circle cx=\"29\" cy=\"52\" r=\"5\" fill=\"#496557\"/>" if bool(gm.get("rollator", false)) else ""
		var headphones := "<path d=\"M-20-50a20 20 0 0 1 40 0\" fill=\"none\" stroke=\"#dfc57f\" stroke-width=\"4\"/><rect x=\"-23\" y=\"-54\" width=\"6\" height=\"17\" rx=\"2\" fill=\"#dfc57f\"/><rect x=\"17\" y=\"-54\" width=\"6\" height=\"17\" rx=\"2\" fill=\"#dfc57f\"/>" if bool(gm.get("headphones", false)) else ""
		people_svg += "<g data-guest=\"%s\" transform=\"translate(%d 321)\"><ellipse cx=\"3\" cy=\"47\" rx=\"34\" ry=\"7\" fill=\"#64735b22\"/><path d=\"M-10 10v33M10 10v33\" stroke=\"#3d5149\" stroke-width=\"10\" stroke-linecap=\"round\"/><rect x=\"-22\" y=\"-30\" width=\"44\" height=\"50\" rx=\"12\" fill=\"%s\"/><path d=\"M-25-19v35M25-19v35\" stroke=\"%s\" stroke-width=\"8\" stroke-linecap=\"round\"/><circle cy=\"-49\" r=\"18\" fill=\"%s\"/><path d=\"M-18-52a18 18 0 0 1 36 0\" fill=\"%s\"/>%s%s<text y=\"76\" text-anchor=\"middle\" font-size=\"15\" fill=\"#41594e\">%s</text></g>" % [
			gid,
			gx,
			String(gm["coat"]),
			String(gm["skin"]),
			String(gm["skin"]),
			String(gm["hair"]),
			headphones,
			walker,
			xml_escape(String(gm["name"]))
		]
	var bunting_svg := ""
	for i in range(15):
		var bx := 55 + i * 37
		bunting_svg += "<path d=\"M%d %sh20l-10 22z\" fill=\"%s\"/>" % [bx, KEEPSAKE_BUNTING_Y[i], String(colors[i % 3])]
	var title_str := "Stories around the Long Table" if lay_id == "table" else "A little room on the Open Floor"
	var escaped_title := xml_escape(title_str)
	var escaped_guests := xml_escape(", ".join(guest_names))
	return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 640 480\" role=\"img\" aria-labelledby=\"title desc\"><title id=\"title\">%s</title><desc id=\"desc\">Fictional gathering keepsake with %s. Rook is not pictured. An original illustration, not a photograph of a real place or person.</desc><rect width=\"640\" height=\"480\" rx=\"8\" fill=\"#faf3df\"/><rect x=\"20\" y=\"20\" width=\"600\" height=\"395\" rx=\"3\" fill=\"#dce2cc\"/><path d=\"M20 105h600M20 282h600\" stroke=\"#c3cdb6\" stroke-width=\"2\"/><path d=\"M45 69Q320 138 595 69\" fill=\"none\" stroke=\"#647b62\" stroke-width=\"2\"/>%s<rect x=\"91\" y=\"123\" width=\"455\" height=\"145\" rx=\"4\" fill=\"#f4e3ba\" stroke=\"#b58e5d\" stroke-width=\"8\"/>%s%s<text x=\"320\" y=\"438\" text-anchor=\"middle\" font-family=\"Georgia,serif\" font-size=\"22\" fill=\"#294f44\">%s</text><text x=\"320\" y=\"461\" text-anchor=\"middle\" font-family=\"sans-serif\" font-size=\"9\" letter-spacing=\"1.5\" fill=\"#6b7b68\">TENDERLOIN REDUX · FICTIONAL GATHERING · ORIGINAL ILLUSTRATION</text></svg>" % [
		escaped_title,
		escaped_guests,
		bunting_svg,
		motifs_svg,
		people_svg,
		escaped_title
	]

func export_keepsake_svg() -> bool:
	var svg := build_keepsake_svg(keepsake_photo)
	if svg.is_empty():
		return false
	last_exported_keepsake_svg = svg
	if OS.has_feature("web"):
		var js_svg := JSON.stringify(svg)
		var js_name := JSON.stringify(KEEPSAKE_EXPORT_FILENAME)
		JavaScriptBridge.eval("window.__tenderloinExportKeepsakeSvg && window.__tenderloinExportKeepsakeSvg(%s, %s);" % [js_svg, js_name], true)
	var summary := "Exported illustrated keepsake SVG (%s · %d bytes · Rook not pictured)." % [KEEPSAKE_EXPORT_FILENAME, svg.to_utf8_buffer().size()]
	if info != null:
		info.text = "%s\nOriginal consent-aware illustration · Tab-local SVG export\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	sync_web_a11y_status()
	return true

func programme_poster_heading(order: Array = programme_published) -> String:
	if order.size() != PROGRAMME_SEGMENTS.size() or programme_issue(order) != "":
		return "Another afternoon, taking shape"
	if String(order[0]) == "stories":
		return "Stories open the afternoon"
	if order.find("stories") < order.find("beats"):
		return "Stories before the rhythm"
	return "A rhythm, a pause, a story"

func build_programme_svg(order: Array = programme_published) -> String:
	if order.size() != PROGRAMME_SEGMENTS.size() or programme_issue(order) != "":
		return ""
	var heading := xml_escape(programme_poster_heading(order))
	var desc_parts: Array[String] = []
	var rows_svg := ""
	for i in range(order.size()):
		var sid := String(order[i])
		var s_name := xml_escape(programme_title(sid))
		var s_col := String(PROGRAMME_SEGMENT_COLORS.get(sid, "#e5b66d"))
		desc_parts.append("%d. %s." % [i + 1, s_name])
		rows_svg += "<g transform=\"translate(32 %d)\"><rect width=\"576\" height=\"61\" rx=\"9\" fill=\"%s\"/><text x=\"18\" y=\"39\" font-family=\"sans-serif\" font-size=\"22\" fill=\"#253c33\">%d. %s</text><circle cx=\"546\" cy=\"30\" r=\"12\" fill=\"#f8ecd9\"/></g>" % [
			110 + i * 73,
			s_col,
			i + 1,
			s_name
		]
	return "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"640\" height=\"460\" viewBox=\"0 0 640 460\" role=\"img\" aria-labelledby=\"title desc\"><title id=\"title\">%s</title><desc id=\"desc\">Fictional future gathering. %s</desc><rect width=\"640\" height=\"460\" rx=\"18\" fill=\"#f8ecd9\"/><text x=\"32\" y=\"44\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#425547\">OUR NEXT AFTERNOON · A FICTIONAL PLAN</text><text x=\"32\" y=\"82\" font-family=\"sans-serif\" font-size=\"25\" fill=\"#253c33\">%s</text>%s<text x=\"32\" y=\"435\" font-family=\"sans-serif\" font-size=\"14\" fill=\"#425547\">Come and go. Listening counts. No date or real event is announced.</text></svg>" % [
		heading,
		" ".join(desc_parts),
		heading,
		rows_svg
	]

func build_tile_panel_svg(art_dict: Dictionary = {}) -> String:
	var src := art_dict
	if src.is_empty():
		var hosted_art: Variant = get_hosted_segment_value("art")
		if hosted_art is Dictionary:
			src = hosted_art as Dictionary
		else:
			src = hosting_draft
	var pal_val: Variant = src.get("palette", "")
	var tiles_val: Variant = src.get("tiles", null)
	if not (pal_val is String) or not (String(pal_val) in HOSTING_PALETTES) or not (tiles_val is Array) or (tiles_val as Array).size() != 6:
		return ""
	var pal_id := String(pal_val)
	var pal_hex: Array = HOSTING_TILE_HEX[pal_id]
	var tiles_svg := ""
	var t_arr: Array = tiles_val
	for i in range(6):
		var tv: Variant = t_arr[i]
		if not is_whole_json_number(tv):
			return ""
		var ti := int(roundf(float(tv)))
		if ti < 0 or ti > 2:
			return ""
		var tx := 24 + (i % 3) * 106
		var ty := 20 + int(i / 3) * 106
		var shape_svg := "<circle cx=\"49\" cy=\"49\" r=\"24\" fill=\"#f8ecd9\"/>" if ti == 0 else ("<path d=\"M12 64 Q32 20 50 50 T86 36\" stroke=\"#f8ecd9\" stroke-width=\"10\" fill=\"none\"/>" if ti == 1 else "<path d=\"M20 76 L49 22 L78 76Z\" fill=\"#f8ecd9\"/>")
		tiles_svg += "<g transform=\"translate(%d %d)\"><rect width=\"98\" height=\"98\" rx=\"7\" fill=\"%s\"/>%s</g>" % [tx, ty, String(pal_hex[ti]), shape_svg]
	return "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"360\" height=\"240\" viewBox=\"0 0 360 240\" role=\"img\" aria-labelledby=\"title desc\"><title id=\"title\">Our six-tile portable panel</title><desc id=\"desc\">Original abstract neighbor-made panel, %s palette. Tiles numbered left to right, top to bottom.</desc><rect width=\"360\" height=\"240\" rx=\"14\" fill=\"#f8ecd9\"/>%s</svg>" % [
		xml_escape(pal_id),
		tiles_svg
	]

func build_civic_plan_svg(plan_dict: Dictionary = {}) -> String:
	var src: Variant = plan_dict
	if (src as Dictionary).is_empty():
		src = civic_result if is_valid_civic_plan(civic_result) else civic_draft
	if not is_valid_civic_plan(src):
		return ""
	var p := copy_civic_plan(src as Dictionary)
	var fmt := String(p.get("format", "circle"))
	var fmt_label := xml_escape(civic_format_title(fmt))
	var shapes_svg := ""
	if fmt == "circle":
		var pts := [[100, 42], [145, 30], [190, 42], [100, 158], [145, 170], [190, 158]]
		for pt in pts:
			shapes_svg += "<circle cx=\"%d\" cy=\"%d\" r=\"10\" fill=\"#75907c\"/>" % [pt[0], pt[1]]
		shapes_svg += "<rect x=\"260\" y=\"30\" width=\"75\" height=\"32\" rx=\"4\" fill=\"#d9a2b2\"/>"
	else:
		shapes_svg = "<rect x=\"80\" y=\"30\" width=\"150\" height=\"30\" rx=\"4\" fill=\"#d9a2b2\"/><circle cx=\"100\" cy=\"165\" r=\"10\" fill=\"#75907c\"/><circle cx=\"155\" cy=\"165\" r=\"10\" fill=\"#75907c\"/>"
	return "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"420\" height=\"210\" viewBox=\"0 0 420 210\"><title>%s: schematic shared-space plan</title><rect width=\"420\" height=\"210\" rx=\"12\" fill=\"#f3eedf\"/><path d=\"M20 100H400\" stroke=\"#91bac2\" stroke-width=\"32\"/><path d=\"M20 100H400\" stroke=\"#fffdf5\" stroke-width=\"2\" stroke-dasharray=\"7 6\"/>%s<text x=\"310\" y=\"105\" font-family=\"sans-serif\" font-size=\"12\" fill=\"#253f35\">Clear route</text><text x=\"22\" y=\"199\" font-family=\"sans-serif\" font-size=\"11\" fill=\"#253f35\">Fictional setup · schematic, not surveyed access widths</text></svg>" % [
		fmt_label,
		shapes_svg
	]

func build_film_frame_svg(plan_dict: Dictionary = {}, shot_id: String = "") -> String:
	var src: Variant = plan_dict
	if (src as Dictionary).is_empty():
		src = film_result if is_valid_film_plan(film_result) else film_draft
	if not is_valid_film_plan(src):
		return ""
	var p := copy_film_plan(src as Dictionary)
	var ord: Array = p.get("order", FILM_SHOTS)
	var target_shot := shot_id
	if target_shot.is_empty():
		var idx := clampi(film_screen_frame, 0, ord.size() - 1)
		target_shot = String(ord[idx])
	if not (target_shot in FILM_SHOTS):
		return ""
	var chair := "<path d=\"M155 143V103H220V143M157 119H218M159 143V167M216 143V167\" fill=\"none\" stroke=\"#276a5a\" stroke-width=\"8\" stroke-linecap=\"round\"/>"
	var panel := "<rect x=\"95\" y=\"54\" width=\"100\" height=\"68\" rx=\"4\" fill=\"#f3eedf\" stroke=\"#276a5a\" stroke-width=\"3\"/><circle cx=\"124\" cy=\"87\" r=\"16\" fill=\"#d9a2b2\"/><path d=\"M146 98Q160 68 180 98\" fill=\"none\" stroke=\"#91bac2\" stroke-width=\"7\"/>"
	var scene_svg := chair if target_shot == "seat" else (panel if target_shot == "paint" else (chair + "<circle cx=\"270\" cy=\"116\" r=\"28\" fill=\"none\" stroke=\"#d9a2b2\" stroke-width=\"7\"/><path d=\"M254 116H286M270 100V132\" stroke=\"#276a5a\" stroke-width=\"4\"/>"))
	var framing := String(p.get("framing", "close"))
	var hands_svg := "<path d=\"M20 167L65 135Q79 129 84 142L57 165L93 163Q108 169 94 180H20M400 167L355 135Q341 129 336 142L363 165L327 163Q312 169 326 180H400\" fill=\"#c38c65\"/>" if framing == "wide" else ""
	var table_edge := "<rect x=\"64\" y=\"176\" width=\"292\" height=\"7\" rx=\"3\" fill=\"#b59b5d\"/>" if framing == "wide" else ""
	var group_attr := " transform=\"translate(-30 -8) scale(1.2)\"" if framing == "close" else ""
	return "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"420\" height=\"236\" viewBox=\"0 0 420 236\"><title>%s — original illustrated frame</title><rect width=\"420\" height=\"236\" rx=\"12\" fill=\"#253f35\"/><rect x=\"12\" y=\"17\" width=\"396\" height=\"202\" rx=\"5\" fill=\"#ecebdc\"/><path d=\"M20 190H400\" stroke=\"#91bac2\" stroke-width=\"6\"/>%s<g%s>%s</g>%s<path d=\"M25 9H395M25 227H395\" stroke=\"#f3eedf\" stroke-width=\"4\" stroke-dasharray=\"8 10\"/></svg>" % [
		xml_escape(film_shot_title(target_shot)),
		table_edge,
		group_attr,
		scene_svg,
		hands_svg
	]

func programme_title(segment_id: String) -> String:
	return String(PROGRAMME_TITLES.get(segment_id, segment_id))

func programme_issue(order: Array = programme_order) -> String:
	var seen: Dictionary = {}
	for raw_id in order:
		if not (raw_id is String):
			return "Each segment can only appear once in the afternoon programme."
		var sid := String(raw_id)
		if not (sid in PROGRAMME_SEGMENTS) or seen.has(sid):
			return "Each segment can only appear once in the afternoon programme."
		seen[sid] = true
	if order.size() < PROGRAMME_SEGMENTS.size():
		var missing_titles: Array[String] = []
		for sid in PROGRAMME_SEGMENTS:
			if not seen.has(sid):
				missing_titles.append(programme_title(sid))
		return "Add all 4 segments to publish (%s remaining)." % ", ".join(missing_titles)
	var beats_at := -1
	var stories_at := -1
	var pause_at := -1
	for i in range(order.size()):
		var sid := String(order[i])
		if sid == "beats":
			beats_at = i
		elif sid == "stories":
			stories_at = i
		elif sid == "pause":
			pause_at = i
	if beats_at < stories_at and not (beats_at < pause_at and pause_at < stories_at):
		return "Place Quiet interval between Rhythm workshop and Story circle when Beats comes before Stories."
	return ""

func programme_add(segment_id: String) -> bool:
	if not block_opened or not (segment_id in PROGRAMME_SEGMENTS) or programme_order.has(segment_id):
		return false
	programme_order.append(segment_id)
	browser_import_message = ""
	save_godot_state()
	update_block_ui()
	return true

func programme_move(segment_id: String, delta: int) -> bool:
	if not block_opened:
		return false
	var at := programme_order.find(segment_id)
	var to := at + (-1 if delta < 0 else 1)
	if at < 0 or to < 0 or to >= programme_order.size():
		return false
	var tmp := programme_order[at]
	programme_order[at] = programme_order[to]
	programme_order[to] = tmp
	browser_import_message = ""
	save_godot_state()
	update_block_ui()
	return true

func programme_publish() -> bool:
	if not block_opened:
		return false
	if programme_issue(programme_order) != "":
		return false
	if programme_order == programme_published:
		return false
	programme_published = programme_order.duplicate()
	browser_import_message = ""
	update_block_3d()
	save_godot_state()
	trigger_progress_cue("programme_published", "4 segments")
	update_block_ui()
	var titles: Array[String] = []
	for sid in programme_published:
		titles.append(programme_title(sid))
	var summary := "Published Second Afternoon Programme: %s" % " -> ".join(titles)
	info.text = "%s\n3D Programme Signboard posted by Bea · Press Z to start hosting\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return true

func is_hosting_ready_to_start() -> bool:
	return block_opened and hosting_order.is_empty() and programme_published.size() == PROGRAMME_SEGMENTS.size() and programme_issue(programme_published) == ""

func current_hosting_activity() -> String:
	if hosting_order.size() != PROGRAMME_SEGMENTS.size() or hosting_results.size() >= hosting_order.size():
		return ""
	return hosting_order[hosting_results.size()]

func is_hosting_done() -> bool:
	return hosting_order.size() == PROGRAMME_SEGMENTS.size() and hosting_results.size() == PROGRAMME_SEGMENTS.size()

func has_hosted_segment(segment_id: String) -> bool:
	for entry in hosting_results:
		if String(entry.get("id", "")) == segment_id:
			return true
	return false

func get_hosted_segment_value(segment_id: String) -> Variant:
	for entry in hosting_results:
		if String(entry.get("id", "")) == segment_id:
			return entry.get("value", null)
	return null

func host_start() -> bool:
	if not is_hosting_ready_to_start():
		return false
	hosting_order = programme_published.duplicate()
	hosting_results.clear()
	hosting_draft = default_hosting_draft()
	browser_import_message = ""
	update_block_3d()
	save_godot_state()
	trigger_progress_cue("hosting_started", hosting_order[0])
	update_block_ui()
	var first_title := programme_title(hosting_order[0])
	var summary := "Started hosting Second Afternoon Programme (1/4: %s)." % first_title
	info.text = "%s\nPress Z to complete each hosted activity across the block (Shift+Z to customize)\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return true

func host_set_story(story_id: String) -> bool:
	if current_hosting_activity() != "stories" or not (story_id in HOSTING_STORIES) or String(hosting_draft.get("story", "memory")) == story_id:
		return false
	hosting_draft["story"] = story_id
	save_godot_state()
	update_block_ui()
	return true

func host_toggle_beat(step: int) -> bool:
	if current_hosting_activity() != "beats" or step < 0 or step > 7:
		return false
	var pat := clampi(int(hosting_draft.get("pattern", 85)), 0, 255)
	var next_pat := (pat ^ (1 << step)) & 255
	hosting_draft["pattern"] = next_pat
	save_godot_state()
	update_block_ui()
	return true

func host_cycle_tile(index: int) -> bool:
	if current_hosting_activity() != "art" or index < 0 or index > 5:
		return false
	var raw_tiles: Array = hosting_draft.get("tiles", HOSTING_DEFAULT_TILES)
	var next_tiles: Array[int] = []
	for i in range(6):
		var v := int(raw_tiles[i]) if i < raw_tiles.size() else HOSTING_DEFAULT_TILES[i]
		next_tiles.append((clampi(v, 0, 2) + 1) % 3 if i == index else clampi(v, 0, 2))
	hosting_draft["tiles"] = next_tiles
	save_godot_state()
	update_block_ui()
	return true

func host_set_palette(pal_id: String) -> bool:
	if current_hosting_activity() != "art" or not (pal_id in HOSTING_PALETTES) or String(hosting_draft.get("palette", "warm")) == pal_id:
		return false
	hosting_draft["palette"] = pal_id
	save_godot_state()
	update_block_ui()
	return true

func host_set_quiet(quiet_id: String) -> bool:
	if current_hosting_activity() != "pause" or not (quiet_id in HOSTING_QUIETS) or String(hosting_draft.get("quiet", "arc")) == quiet_id:
		return false
	hosting_draft["quiet"] = quiet_id
	save_godot_state()
	update_block_ui()
	return true

func host_complete_current() -> bool:
	var active := current_hosting_activity()
	if active == "":
		return false
	var entry: Dictionary = {"id": active}
	if active == "stories":
		var st := String(hosting_draft.get("story", "memory"))
		entry["value"] = st if st in HOSTING_STORIES else "memory"
	elif active == "beats":
		var pat := clampi(int(hosting_draft.get("pattern", 85)), 0, 255)
		entry["value"] = pat
	elif active == "art":
		var raw_t: Array = hosting_draft.get("tiles", HOSTING_DEFAULT_TILES)
		var clean_t: Array[int] = []
		for i in range(6):
			var v := int(raw_t[i]) if i < raw_t.size() else HOSTING_DEFAULT_TILES[i]
			clean_t.append(clampi(v, 0, 2))
		var pal := String(hosting_draft.get("palette", "warm"))
		entry["value"] = {
			"palette": pal if pal in HOSTING_PALETTES else "warm",
			"tiles": clean_t
		}
	elif active == "pause":
		var q := String(hosting_draft.get("quiet", "arc"))
		entry["value"] = q if q in HOSTING_QUIETS else "arc"
	hosting_results.append(entry)
	browser_import_message = ""
	update_block_3d()
	save_godot_state()
	if is_hosting_done():
		trigger_progress_cue("hosting_complete", "4/4 hosted")
	else:
		trigger_progress_cue("hosting_segment", active)
	update_block_ui()
	var next_act := current_hosting_activity()
	var summary := "Completed %s (%d/4 hosted)%s" % [programme_title(active), hosting_results.size(), " — Second Afternoon Complete!" if next_act == "" else (" · Next: " + programme_title(next_act))]
	info.text = "%s\nM3 Second Afternoon Programme & Hosting · Sound-independent\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return true

func cycle_programme_or_hosting_choice() -> String:
	show_block_panel(true)
	if not block_opened:
		return "locked"
	var active := current_hosting_activity()
	if active == "stories":
		var next_st := "future" if String(hosting_draft.get("story", "memory")) == "memory" else "memory"
		host_set_story(next_st)
		announce_a11y_status("Story circle invitation set to %s." % next_st)
		return "story_" + next_st
	elif active == "beats":
		host_toggle_beat(0)
		var pat := int(hosting_draft.get("pattern", 85))
		announce_a11y_status("Rhythm workshop pattern set to %d." % pat)
		return "beats_%d" % pat
	elif active == "art":
		var next_pal := "cool" if String(hosting_draft.get("palette", "warm")) == "warm" else "warm"
		host_set_palette(next_pal)
		host_cycle_tile(0)
		announce_a11y_status("Shared art panel palette set to %s." % next_pal)
		return "art_" + next_pal
	elif active == "pause":
		var next_q := "pairs" if String(hosting_draft.get("quiet", "arc")) == "arc" else "arc"
		host_set_quiet(next_q)
		announce_a11y_status("Quiet interval seating set to %s." % next_q)
		return "pause_" + next_q
	if programme_order.size() < PROGRAMME_SEGMENTS.size():
		for sid in PROGRAMME_DEFAULT_ORDER:
			if not programme_order.has(sid):
				programme_add(sid)
				return "added_" + sid
	if programme_order.size() == PROGRAMME_SEGMENTS.size():
		programme_move("stories", 1 if programme_order[0] == "stories" else -1)
		return "moved_stories"
	return "noop"

func advance_programme_and_hosting_step() -> String:
	show_block_panel(true)
	if not block_opened:
		var msg := "Open the Turk Street block gathering (O) before publishing or hosting the Second Afternoon Programme."
		last_panel_dialogue = "Bea: \"Let's open the Turk Street block party first (%s)—then we'll plan and host our 4 party activities!\"" % get_block_missing_summary()
		update_block_ui()
		info.text = "%s\nVisit all 5 neighbors, complete 3/3 mural motifs, and soundcheck with Rook\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % msg
		announce_a11y_status(msg)
		return "locked"
	if programme_published.size() < PROGRAMME_SEGMENTS.size():
		if programme_order.is_empty():
			for sid in PROGRAMME_DEFAULT_ORDER:
				programme_add(sid)
		var issue := programme_issue(programme_order)
		if issue != "":
			last_panel_dialogue = "Bea: \"%s\"" % issue
			update_block_ui()
			info.text = "%s\nAdjust programme draft before publishing\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % issue
			announce_a11y_status(issue)
			return "programme_blocked"
		var ok_pub := programme_publish()
		if ok_pub:
			last_panel_dialogue = "Bea: \"Party schedule posted on the signboard! Tap 'Start Hosting Party' to kick off the first activity.\""
			update_block_ui()
		return "programme_published" if ok_pub else "programme_blocked"
	if hosting_order.is_empty():
		var ok_st := host_start()
		if ok_st:
			last_panel_dialogue = "Bea: \"We're hosting 1/4: %s! Tap 'Host Activity' to lead each segment across the block.\"" % programme_title(hosting_order[0])
			update_block_ui()
		return "hosting_started" if ok_st else "hosting_blocked"
	if not is_hosting_done():
		var act := current_hosting_activity()
		var ok_hc := host_complete_current()
		if ok_hc:
			var next_a := current_hosting_activity()
			last_panel_dialogue = "Bea: \"All 4 party schedule activities hosted! Now we can hold our Tenant Listening Circle.\"" if next_a == "" else ("Bea: \"Finished %s (%d/4)—up next is %s!\"" % [programme_title(act), hosting_results.size(), programme_title(next_a)])
			update_block_ui()
		return ("hosted_" + act) if ok_hc else "hosting_blocked"
	var done_msg := "Second Afternoon Programme complete: 4/4 activities hosted across Turk Street."
	last_panel_dialogue = "Bea: \"All 4 party schedule activities are complete! Tap 'Hold Tenant Circle' to gather neighbors.\""
	update_block_ui()
	info.text = "%s\nStory circle, Rhythm workshop, Quiet interval, and Shared art panel complete\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % done_msg
	announce_a11y_status(done_msg)
	return "hosting_complete"

func default_civic_draft() -> Dictionary:
	return {"topic": "repairs", "format": "circle", "notes": "themes"}

func is_civic_available() -> bool:
	return block_opened and is_hosting_done()

func is_valid_civic_plan(raw_val: Variant) -> bool:
	if not (raw_val is Dictionary):
		return false
	var d: Dictionary = raw_val
	var t_val: Variant = d.get("topic", null)
	var f_val: Variant = d.get("format", null)
	var n_val: Variant = d.get("notes", null)
	return (t_val is String) and (String(t_val) in CIVIC_TOPICS) and (f_val is String) and (String(f_val) in CIVIC_FORMATS) and (n_val is String) and (String(n_val) in CIVIC_NOTES)

func copy_civic_plan(raw_val: Dictionary) -> Dictionary:
	var t := String(raw_val.get("topic", "repairs"))
	var f := String(raw_val.get("format", "circle"))
	var n := String(raw_val.get("notes", "themes"))
	return {
		"topic": t if t in CIVIC_TOPICS else "repairs",
		"format": f if f in CIVIC_FORMATS else "circle",
		"notes": n if n in CIVIC_NOTES else "themes"
	}

func civic_topic_title(topic_id: String) -> String:
	return String(CIVIC_TOPIC_LABELS.get(topic_id, topic_id))

func civic_format_title(format_id: String) -> String:
	return String(CIVIC_FORMAT_LABELS.get(format_id, format_id))

func civic_notes_title(notes_id: String) -> String:
	return String(CIVIC_NOTE_LABELS.get(notes_id, notes_id))

func civic_start() -> bool:
	if not is_civic_available() or civic_phase != "idle":
		return false
	civic_phase = "planning"
	civic_draft = default_civic_draft()
	civic_result = {}
	browser_import_message = ""
	last_panel_dialogue = "Bea: \"Planning our Tenant Listening Circle (%s · %s). Tap 'Convene Circle' when ready!\"" % [civic_topic_title(String(civic_draft.get("topic", "repairs"))), civic_format_title(String(civic_draft.get("format", "circle")))]
	update_block_3d()
	save_godot_state()
	trigger_progress_cue("civic_planning", "Listening hour")
	update_block_ui()
	var summary := "Started planning Peaceful Tenant Listening Hour (%s · %s · %s)." % [civic_topic_title(String(civic_draft.get("topic", "repairs"))), civic_format_title(String(civic_draft.get("format", "circle"))), civic_notes_title(String(civic_draft.get("notes", "themes")))]
	info.text = "%s\nPress Q to convene listening hour or Shift+Q to cycle all 8 topic/seating/notes plans\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return true

func civic_set_choice(key: String, val: String) -> bool:
	if not is_civic_available() or civic_phase != "planning":
		return false
	if key == "topic":
		if not (val in CIVIC_TOPICS) or String(civic_draft.get("topic", "repairs")) == val:
			return false
		civic_draft["topic"] = val
	elif key == "format":
		if not (val in CIVIC_FORMATS) or String(civic_draft.get("format", "circle")) == val:
			return false
		civic_draft["format"] = val
	elif key == "notes":
		if not (val in CIVIC_NOTES) or String(civic_draft.get("notes", "themes")) == val:
			return false
		civic_draft["notes"] = val
	else:
		return false
	browser_import_message = ""
	save_godot_state()
	update_block_ui()
	return true

func civic_convene() -> bool:
	if not is_civic_available() or civic_phase != "planning":
		return false
	civic_result = copy_civic_plan(civic_draft)
	civic_draft = copy_civic_plan(civic_result)
	civic_phase = "meeting"
	browser_import_message = ""
	last_panel_dialogue = "Bea: \"Neighbors are gathered for '%s'—tap 'Share Circle Notes' to wrap up the circle.\"" % civic_topic_title(String(civic_result.get("topic", "repairs")))
	update_block_3d()
	save_godot_state()
	trigger_progress_cue("civic_meeting", String(civic_result.get("topic", "repairs")))
	update_block_ui()
	var summary := "Convened Peaceful Tenant Listening Hour: %s (%s · %s)." % [civic_topic_title(String(civic_result.get("topic", "repairs"))), civic_format_title(String(civic_result.get("format", "circle"))), civic_notes_title(String(civic_result.get("notes", "themes")))]
	info.text = "%s\n3D Listening Circle & Notes Easel active on Turk Street · Press Q to complete\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return true

func civic_complete() -> bool:
	if not is_civic_available() or civic_phase != "meeting" or not is_valid_civic_plan(civic_result):
		return false
	civic_phase = "done"
	browser_import_message = ""
	last_panel_dialogue = "Bea: \"Tenant Listening Circle complete! Now we can shoot 'The Open Seat' short film ('Shoot Short Film').\""
	update_block_3d()
	save_godot_state()
	trigger_progress_cue("civic_complete", "Listening hour complete")
	update_block_ui()
	var summary := "Completed Peaceful Tenant Listening Hour (%s · %s · %s) — The Open Seat film short ready!" % [civic_topic_title(String(civic_result.get("topic", "repairs"))), civic_format_title(String(civic_result.get("format", "circle"))), civic_notes_title(String(civic_result.get("notes", "themes")))]
	info.text = "%s\nM4 Civic Listening Hour Complete · Press Period (.) to plan The Open Seat\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return true

func cycle_civic_choice() -> String:
	show_block_panel(true)
	if not is_civic_available():
		return "locked"
	if civic_phase == "idle":
		civic_start()
		return "started"
	if civic_phase != "planning":
		return "noop"
	var t_idx := maxi(0, CIVIC_TOPICS.find(String(civic_draft.get("topic", "repairs"))))
	var f_idx := maxi(0, CIVIC_FORMATS.find(String(civic_draft.get("format", "circle"))))
	var n_idx := maxi(0, CIVIC_NOTES.find(String(civic_draft.get("notes", "themes"))))
	var combo := posmod((t_idx * 4) + (f_idx * 2) + n_idx + 1, 8)
	var next_topic := CIVIC_TOPICS[(combo >> 2) & 1]
	var next_fmt := CIVIC_FORMATS[(combo >> 1) & 1]
	var next_notes := CIVIC_NOTES[combo & 1]
	civic_draft["topic"] = next_topic
	civic_draft["format"] = next_fmt
	civic_draft["notes"] = next_notes
	browser_import_message = ""
	save_godot_state()
	update_block_ui()
	var summary := "Listening hour draft set to %s · %s · %s." % [civic_topic_title(next_topic), civic_format_title(next_fmt), civic_notes_title(next_notes)]
	info.text = "%s\nPress Q to convene Peaceful Tenant Listening Hour\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return "choice_%s_%s_%s" % [next_topic, next_fmt, next_notes]

func advance_civic_step() -> String:
	show_block_panel(true)
	if not is_civic_available():
		var msg := "Complete the 4 Second Afternoon Programme activities (Z) before starting the Peaceful Tenant Listening Hour."
		last_panel_dialogue = "Bea: \"Let's finish hosting our 4 party schedule activities ('Plan Party Schedule') first, then we'll hold our Tenant Circle!\""
		update_block_ui()
		info.text = "%s\nM4 Civic Listening Hour unlocks after all 4 hosted segments finish\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % msg
		announce_a11y_status(msg)
		return "locked"
	if civic_phase == "idle":
		return "civic_planning" if civic_start() else "civic_blocked"
	if civic_phase == "planning":
		return "civic_meeting" if civic_convene() else "civic_blocked"
	if civic_phase == "meeting":
		return "civic_done" if civic_complete() else "civic_blocked"
	var done_msg := "Peaceful Tenant Listening Hour complete (%s · %s · %s)." % [civic_topic_title(String(civic_result.get("topic", "repairs"))), civic_format_title(String(civic_result.get("format", "circle"))), civic_notes_title(String(civic_result.get("notes", "themes")))]
	last_panel_dialogue = "Bea: \"Our Tenant Listening Circle is complete (%s)! Tap 'Shoot Short Film' to film The Open Seat.\"" % civic_topic_title(String(civic_result.get("topic", "repairs")))
	update_block_ui()
	info.text = "%s\nPress Period (.) to plan & capture The Open Seat three-shot film short\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % done_msg
	announce_a11y_status(done_msg)
	return "civic_complete"

func default_film_draft() -> Dictionary:
	var ord: Array[String] = []
	for s_id in FILM_SHOTS:
		ord.append(s_id)
	return {"framing": "close", "plan": "quiet", "order": ord}

func is_film_available() -> bool:
	return block_opened and civic_phase == "done"

func is_valid_film_order(raw_order: Variant) -> bool:
	if not (raw_order is Array):
		return false
	var ord: Array = raw_order
	if ord.size() != FILM_SHOTS.size():
		return false
	var seen: Dictionary = {}
	for item in ord:
		if not (item is String):
			return false
		var sid := String(item)
		if not (sid in FILM_SHOTS) or seen.has(sid):
			return false
		seen[sid] = true
	return seen.size() == FILM_SHOTS.size()

func is_valid_film_plan(raw_val: Variant) -> bool:
	if not (raw_val is Dictionary):
		return false
	var d: Dictionary = raw_val
	var fr_val: Variant = d.get("framing", null)
	var pl_val: Variant = d.get("plan", null)
	return (fr_val is String) and (String(fr_val) in FILM_FRAMING) and (pl_val is String) and (String(pl_val) in FILM_PLANS) and is_valid_film_order(d.get("order", null))

func copy_film_plan(raw_val: Dictionary) -> Dictionary:
	var fr := String(raw_val.get("framing", "close"))
	var pl := String(raw_val.get("plan", "quiet"))
	var clean_ord: Array[String] = []
	var raw_ord: Variant = raw_val.get("order", null)
	if is_valid_film_order(raw_ord):
		for item in (raw_ord as Array):
			clean_ord.append(String(item))
	else:
		for s_id in FILM_SHOTS:
			clean_ord.append(s_id)
	return {
		"framing": fr if fr in FILM_FRAMING else "close",
		"plan": pl if pl in FILM_PLANS else "quiet",
		"order": clean_ord
	}

func film_shot_title(shot_id: String) -> String:
	return String(FILM_SHOT_LABELS.get(shot_id, shot_id))

func film_next_shot() -> String:
	if film_phase != "shooting" or not is_valid_film_plan(film_result):
		return ""
	var ord: Array = film_result.get("order", [])
	if film_captured.size() >= ord.size():
		return ""
	return String(ord[film_captured.size()])

func film_start() -> bool:
	if not is_film_available() or film_phase != "idle":
		return false
	film_phase = "planning"
	film_draft = default_film_draft()
	film_result = {}
	film_captured.clear()
	film_screen_frame = 0
	browser_import_message = ""
	update_block_3d()
	save_godot_state()
	trigger_progress_cue("film_planning", "The Open Seat")
	update_block_ui()
	var summary := "Started planning The Open Seat three-shot film short (Objects in close-up · A quiet prop take · Seat -> Paint -> Welcome)."
	info.text = "%s\nPress Period (.) to roll/hold for clear route or Shift+Period to cycle all 24 film plans\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return true

func film_set_choice(key: String, val: String) -> bool:
	if not is_film_available() or film_phase != "planning":
		return false
	if key == "framing":
		if not (val in FILM_FRAMING) or String(film_draft.get("framing", "close")) == val:
			return false
		film_draft["framing"] = val
	elif key == "plan":
		if not (val in FILM_PLANS) or String(film_draft.get("plan", "quiet")) == val:
			return false
		film_draft["plan"] = val
	else:
		return false
	browser_import_message = ""
	save_godot_state()
	update_block_ui()
	return true

func film_move_shot(shot_id: String, delta: int) -> bool:
	if not is_film_available() or film_phase != "planning" or not (shot_id in FILM_SHOTS):
		return false
	var raw_ord: Variant = film_draft.get("order", FILM_SHOTS)
	var ord: Array[String] = []
	if is_valid_film_order(raw_ord):
		for item in (raw_ord as Array):
			ord.append(String(item))
	else:
		for s_id in FILM_SHOTS:
			ord.append(s_id)
	var at := ord.find(shot_id)
	var to := at + (-1 if delta < 0 else 1)
	if at < 0 or to < 0 or to >= ord.size():
		return false
	var tmp := ord[at]
	ord[at] = ord[to]
	ord[to] = tmp
	film_draft["order"] = ord
	browser_import_message = ""
	save_godot_state()
	update_block_ui()
	return true

func film_hold() -> bool:
	if not is_film_available() or film_phase != "planning":
		return false
	film_result = copy_film_plan(film_draft)
	film_draft = copy_film_plan(film_result)
	film_captured.clear()
	film_screen_frame = 0
	film_phase = "hold"
	browser_import_message = ""
	update_block_3d()
	save_godot_state()
	update_block_ui()
	var summary := "The Open Seat crew holds the take beside the clear route until neighbors pass (hold)."
	info.text = "%s\n3D Storyboard Easel ready · Press Period (.) when the route is clear to begin shooting\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return true

func film_begin_shooting() -> bool:
	if not is_film_available() or film_phase != "hold" or not is_valid_film_plan(film_result):
		return false
	var plan_src := copy_film_plan(film_result)
	film_result = plan_src
	film_draft = copy_film_plan(plan_src)
	film_captured.clear()
	film_screen_frame = 0
	film_phase = "shooting"
	browser_import_message = ""
	update_block_3d()
	save_godot_state()
	trigger_progress_cue("film_shooting", film_next_shot())
	update_block_ui()
	var next_title := film_shot_title(film_next_shot())
	var summary := "Route clear — started shooting The Open Seat (0/3 frames · Next: %s)." % next_title
	info.text = "%s\n3D Storyboard Easel active · Press Period (.) to capture each frame in order\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return true

func film_capture_shot(shot_id: String = "") -> bool:
	if not is_film_available() or film_phase != "shooting" or not is_valid_film_plan(film_result):
		return false
	var expected := film_next_shot()
	var target_shot := expected if shot_id.is_empty() else shot_id
	if expected.is_empty() or target_shot != expected:
		return false
	film_captured.append(expected)
	if film_captured.size() == FILM_SHOTS.size():
		film_phase = "done"
		film_screen_frame = 0
	browser_import_message = ""
	update_block_3d()
	save_godot_state()
	if film_phase == "done":
		trigger_progress_cue("film_complete", "The Open Seat 3/3")
	else:
		trigger_progress_cue("film_shot", expected)
	update_block_ui()
	var cap_title := film_shot_title(expected)
	var summary := "Captured %s (%d/3 frames)%s" % [cap_title, film_captured.size(), " — The Open Seat Complete!" if film_phase == "done" else (" · Next: " + film_shot_title(film_next_shot()))]
	info.text = "%s\nM4 Three-Shot Film Short (The Open Seat) · Sound-independent\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return true

func film_set_screen_frame(index: int) -> bool:
	if film_phase != "done" or index < 0 or index >= FILM_SHOTS.size() or not is_valid_film_plan(film_result):
		return false
	film_screen_frame = index
	update_block_3d()
	update_block_ui()
	var ord: Array = film_result.get("order", FILM_SHOTS)
	var shot_id := String(ord[index]) if index < ord.size() else "seat"
	var summary := "Viewing The Open Seat Frame %d/3: %s." % [index + 1, film_shot_title(shot_id)]
	info.text = "%s\nTransient storyboard viewer frame (resets to Frame 1 on reload)\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return true

func all_film_shot_orders() -> Array[Array]:
	return [
		["seat", "paint", "welcome"],
		["seat", "welcome", "paint"],
		["paint", "seat", "welcome"],
		["paint", "welcome", "seat"],
		["welcome", "seat", "paint"],
		["welcome", "paint", "seat"]
	]

func cycle_film_choice_or_frame() -> String:
	show_block_panel(true)
	if not is_film_available():
		return "locked"
	if film_phase == "idle":
		film_start()
		return "started"
	if film_phase == "planning":
		var orders := all_film_shot_orders()
		var cur_ord: Array = film_draft.get("order", FILM_SHOTS)
		var ord_idx := 0
		for i in range(orders.size()):
			var cand: Array = orders[i]
			if cur_ord.size() == 3 and String(cur_ord[0]) == String(cand[0]) and String(cur_ord[1]) == String(cand[1]) and String(cur_ord[2]) == String(cand[2]):
				ord_idx = i
				break
		var fr_idx := maxi(0, FILM_FRAMING.find(String(film_draft.get("framing", "close"))))
		var pl_idx := maxi(0, FILM_PLANS.find(String(film_draft.get("plan", "quiet"))))
		var combo := posmod((fr_idx * 12) + (pl_idx * 6) + ord_idx + 1, 24)
		var next_fr := FILM_FRAMING[(combo / 12) % 2]
		var next_pl := FILM_PLANS[(combo / 6) % 2]
		var next_ord_raw: Array = orders[combo % 6]
		var next_ord: Array[String] = []
		for item in next_ord_raw:
			next_ord.append(String(item))
		film_draft["framing"] = next_fr
		film_draft["plan"] = next_pl
		film_draft["order"] = next_ord
		browser_import_message = ""
		save_godot_state()
		update_block_ui()
		var summary := "The Open Seat draft set to %s · %s · %s." % [next_fr, next_pl, "->".join(next_ord)]
		info.text = "%s\nPress Period (.) to hold for clear route or Shift+Period to cycle all 24 film plans\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
		announce_a11y_status(summary)
		return "draft_%s_%s_%s" % [next_fr, next_pl, "_".join(next_ord)]
	if film_phase == "done":
		var next_idx := posmod(film_screen_frame + 1, FILM_SHOTS.size())
		film_set_screen_frame(next_idx)
		return "frame_%d" % next_idx
	return "noop"

func advance_film_step() -> String:
	show_block_panel(true)
	if not is_film_available():
		var msg := "Complete the Peaceful Tenant Listening Hour (Q) before planning The Open Seat three-shot film short."
		last_panel_dialogue = "Dez: \"Let's hold our Tenant Listening Circle ('Hold Tenant Circle') first—then we'll shoot our 3-frame short film!\""
		update_block_ui()
		info.text = "%s\nM4 Film Short unlocks after the listening hour finishes\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % msg
		announce_a11y_status(msg)
		return "locked"
	if film_phase == "idle":
		var ok_fs := film_start()
		if ok_fs:
			last_panel_dialogue = "Dez: \"Storyboard easel ready! Tap 'Set Up Film Shot' to hold the take beside the clear route.\""
			update_block_ui()
		return "film_planning" if ok_fs else "film_blocked"
	if film_phase == "planning":
		var ok_fh := film_hold()
		if ok_fh:
			last_panel_dialogue = "Dez: \"Holding the take while neighbors use the sidewalk—tap 'Roll Camera (Clear)' to start shooting!\""
			update_block_ui()
		return "film_hold" if ok_fh else "film_blocked"
	if film_phase == "hold":
		var ok_fb := film_begin_shooting()
		if ok_fb:
			last_panel_dialogue = "Dez: \"Route is clear! Tap 'Shoot Frame' to capture %s.\"" % film_shot_title(film_next_shot())
			update_block_ui()
		return "film_shooting" if ok_fb else "film_blocked"
	if film_phase == "shooting":
		var next_s := film_next_shot()
		if not film_capture_shot():
			return "film_blocked"
		if film_phase == "done":
			last_panel_dialogue = "Dez: \"That's a wrap on 'The Open Seat' (3/3 frames)! Tap 'Watch Film' to cycle frames.\""
		else:
			last_panel_dialogue = "Dez: \"Captured %s (%d/3)! Next frame: %s.\"" % [film_shot_title(next_s), film_captured.size(), film_shot_title(film_next_shot())]
		update_block_ui()
		return "film_done" if film_phase == "done" else ("captured_" + next_s)
	var next_idx := posmod(film_screen_frame + 1, FILM_SHOTS.size())
	film_set_screen_frame(next_idx)
	var ord: Array = film_result.get("order", FILM_SHOTS)
	var shot_id := String(ord[next_idx]) if next_idx < ord.size() else "seat"
	last_panel_dialogue = "Dez: \"Screening 'The Open Seat' Frame %d/3: %s.\"" % [next_idx + 1, film_shot_title(shot_id)]
	update_block_ui()
	return "film_complete_frame_%d" % next_idx

func neighbor_surprise_memory_line(neighbor_id: String) -> String:
	match neighbor_id:
		"bea":
			if discovered_surprises.has("mayor_pomp_event") and discovered_surprises.has("good_donut_and_bagel"):
				return "“The Block Mayor cut a giant ribbon on Eddy & Leavenworth with pomp and circumstance, and Baker Mae shared warm donuts and everything bagels on Eddy & Taylor!”"
			if discovered_surprises.has("mayor_pomp_event"):
				return "“Did you see the Block Mayor's impromptu ribbon cutting on Eddy & Leavenworth? All that pomp and circumstance for Neighbor Appreciation Hour!”"
			if discovered_surprises.has("good_donut_and_bagel"):
				return "“Baker Mae's pink-frosted glazed donut and toasted everything bagel on Eddy & Taylor are the warmest treat on the block!”"
		"celeste":
			if discovered_surprises.has("hidden_mural_145") and discovered_surprises.has("cutesy_dino"):
				return "“You found my hidden mural below the 8th floor at 145 Leavenworth and met Pip the Tiny Dino by Boeddeker Park—I pinned the sketch to my easel!”"
			if discovered_surprises.has("hidden_mural_145"):
				return "“You found my hidden mural alcove at 145 Leavenworth below the 8th-floor bay window! I pinned the golden hound and sax sketch right onto my easel.”"
			if discovered_surprises.has("cutesy_dino"):
				return "“Pip the Tiny Dino by Boeddeker Park wagged that pastel tail while I sketched those mint-and-coral back plates!”"
		"rook":
			if discovered_surprises.has("jeffrey_record") and discovered_surprises.has("clown_horn_walker"):
				return "“Jeffrey's 1961 LP from 361 Turk is spinning on top of my speaker, and Honker Barnaby honked right on the downbeat!”"
			if discovered_surprises.has("jeffrey_record"):
				return "“You brought Jeffrey's lost 1961 record from the 361 Turk 'So What' awning! Look on top of my speaker—that 33 RPM vinyl is spinning for the whole block.”"
			if discovered_surprises.has("clown_horn_walker"):
				return "“Honker Barnaby strolled past Jones & Turk and gave two gentle squeezes on that red-bulb clown horn right in pocket with our groove!”"
		"dez":
			if discovered_surprises.has("viking_dirt_biker") and discovered_surprises.has("magic_carpet_chef"):
				return "“A Viking-helmet dirt biker on the 200 block of Turk and Chef Zafira flying on a magic carpet over Eddy—this neighborhood has the best rhythm in the city!”"
			if discovered_surprises.has("viking_dirt_biker"):
				return "“That guy idling on a dirt bike in a horned Viking helmet on the 200 block of Turk nodded right in time with our 80 BPM pocket!”"
			if discovered_surprises.has("magic_carpet_chef"):
				return "“Chef Zafira floated above Eddy & Leavenworth on her crimson-and-gold magic carpet tossing star-anise noodles in a flaming copper wok!”"
		"thanh":
			if discovered_surprises.has("impromptu_drag_show") and discovered_surprises.has("bite_size_nachos"):
				return "“Starlight Vee's surprise drag runway at Taylor & Turk and Nacho Captain Rico's bite-sized nacho bags made the whole sidewalk glow!”"
			if discovered_surprises.has("impromptu_drag_show"):
				return "“Starlight Vee rolled out a magenta runway near Taylor & Turk for an impromptu drag show right in the Transgender Cultural District!”"
			if discovered_surprises.has("bite_size_nachos"):
				return "“Nacho Captain Rico shared warm bite-sized bags of tortilla chips and roasted salsa verde right down the sidewalk from my tea table!”"
	return ""

func neighbor_project_memory_line(neighbor_id: String) -> String:
	var surp_mem := neighbor_surprise_memory_line(neighbor_id)
	var base_mem := ""
	if film_phase == "done" and is_valid_film_plan(film_result):
		var ord: Array = film_result.get("order", FILM_SHOTS)
		var last_shot := film_shot_title(String(ord[2]) if ord.size() >= 3 else "welcome").to_lower()
		var framing := String(film_result.get("framing", "close"))
		var plan := String(film_result.get("plan", "quiet"))
		match neighbor_id:
			"rook":
				base_mem = "“I helped with the cue and stayed out of the picture. A no can belong in a good film too.”"
			"celeste":
				base_mem = "“Dez and I offered our hands, not everyone else’s faces. We made the picture together.”" if framing == "wide" else "“Our props told the story without putting anyone on camera. I like that small frame.”"
			"thanh":
				base_mem = "“The crew held the take while I used the route. A production should fit around the people who live here.”"
			"bea":
				base_mem = "“They waited until the conversation finished. Being heard mattered more than rushing a take.”" if plan == "later" else "“We could keep talking while they worked quietly. The film made room for our afternoon.”"
			"dez":
				base_mem = "“We ended on %s. A different order would tell a different little story.”" % last_shot
	elif civic_phase == "done" and is_valid_civic_plan(civic_result):
		var topic := String(civic_result.get("topic", "repairs"))
		var fmt := String(civic_result.get("format", "circle"))
		var notes := String(civic_result.get("notes", "themes"))
		match neighbor_id:
			"bea":
				base_mem = "“We put repairs and staying put into the conversation. One listening hour is a beginning, not a promise that housing problems are solved.”" if topic == "repairs" else "“I still want us to talk about repairs. Making room to come and go gave us a useful place to begin.”"
			"thanh":
				base_mem = "“I could join for a few minutes and leave when I needed to. Keeping the table off the route mattered.”" if fmt == "dropin" else "“I liked hearing everyone together. Next time, could we leave a drop-in moment for people who cannot stay?”"
			"celeste":
				base_mem = "“The shared request has no names or personal stories attached. Nobody owes us their story.”" if notes == "themes" else "“We agreed to keep no meeting notes. Listening can matter without making a record of someone.”"
			"rook":
				base_mem = "“No microphone needed. A listening hour can have room for a disagreement and a quiet voice.”"
			"dez":
				base_mem = "“I helped welcome people who just wanted to listen. Nobody had to sign anything or agree to belong.”"
	if not base_mem.is_empty() and not surp_mem.is_empty():
		return "%s · %s" % [base_mem, surp_mem]
	return base_mem if not base_mem.is_empty() else surp_mem

func neighbor_memory_tail(n_id: String, spoken_line: String, turn_count: int = 1) -> String:
	var surp_only := neighbor_surprise_memory_line(n_id)
	var full_mem := neighbor_project_memory_line(n_id)
	if full_mem.is_empty():
		return ""
	var clean_surp := surp_only.trim_prefix("“").trim_suffix("”")
	if not clean_surp.is_empty() and spoken_line.contains(clean_surp):
		return full_mem.trim_suffix(" · " + surp_only) if full_mem != surp_only else ""
	if not surp_only.is_empty() and full_mem != surp_only:
		var base_only := full_mem.trim_suffix(" · " + surp_only)
		return surp_only if (maxi(1, turn_count) % 2 == 0) else base_only
	return full_mem

func is_test_suite_mode() -> bool:
	for arg in OS.get_cmdline_user_args():
		if arg == "--test-suite":
			return true
	for arg in OS.get_cmdline_args():
		if arg.ends_with("study_test.gd") or arg == "--test-suite":
			return true
	return false

func resolve_settings_path() -> String:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--godot-settings-path="):
			var custom := arg.trim_prefix("--godot-settings-path=").strip_edges()
			if not custom.is_empty():
				return custom
	if is_test_suite_mode():
		return GODOT_TEST_SETTINGS_PATH
	return GODOT_SETTINGS_PATH

func save_godot_settings() -> bool:
	var env := {
		"schema": "tenderloin-redux.godot.settings.v1",
		"version": 1,
		"neighborhood_voices": voices_enabled,
		"reward_sounds": reward_sounds_enabled
	}
	var raw_json := JSON.stringify(env)
	var wrote := false
	if OS.has_feature("web"):
		var js_literal := JSON.stringify(raw_json)
		var web_ok: Variant = JavaScriptBridge.eval("try { window.localStorage.setItem('%s', %s); true; } catch (_e) { false; }" % [GODOT_SETTINGS_WEB_STORAGE_KEY, js_literal], true)
		wrote = bool(web_ok)
	if not wrote and not settings_path.is_empty():
		var file := FileAccess.open(settings_path, FileAccess.WRITE)
		if file != null:
			file.store_string(raw_json)
			file.close()
			wrote = true
	return wrote

func load_godot_settings() -> bool:
	set_reward_sounds_enabled(true, false)
	var raw_str := ""
	if OS.has_feature("web"):
		var web_val: Variant = JavaScriptBridge.eval("try { window.localStorage.getItem('%s') || ''; } catch (_e) { ''; }" % GODOT_SETTINGS_WEB_STORAGE_KEY, true)
		if web_val is String and not String(web_val).strip_edges().is_empty():
			raw_str = String(web_val)
	if raw_str.is_empty() and not settings_path.is_empty() and FileAccess.file_exists(settings_path):
		raw_str = FileAccess.get_file_as_string(settings_path)
	var trimmed := raw_str.strip_edges()
	if trimmed.is_empty() or not trimmed.begins_with("{") or not trimmed.ends_with("}"):
		set_voices_enabled(false, false)
		return false
	var parsed: Variant = JSON.parse_string(trimmed)
	if not (parsed is Dictionary):
		set_voices_enabled(false, false)
		return false
	var env: Dictionary = parsed
	if String(env.get("schema", "")) != "tenderloin-redux.godot.settings.v1":
		set_voices_enabled(false, false)
		return false
	var nv_val: Variant = env.get("neighborhood_voices", false)
	var sounds_val: Variant = env.get("reward_sounds", true)
	if sounds_val is bool:
		set_reward_sounds_enabled(bool(sounds_val), false)
	if not (nv_val is bool):
		set_voices_enabled(false, false)
		return false
	return set_voices_enabled(bool(nv_val), false)

func clear_godot_settings() -> void:
	set_reward_sounds_enabled(true, false)
	voices_custom_json_override = ""
	voices_simulate_error = false
	if not settings_path.is_empty() and FileAccess.file_exists(settings_path):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(settings_path))
	if OS.has_feature("web"):
		JavaScriptBridge.eval("try { window.localStorage.removeItem('%s'); } catch (_e) {}" % GODOT_SETTINGS_WEB_STORAGE_KEY, true)
	set_voices_enabled(false, false)

func validate_voices_payload(raw_json: String) -> Dictionary:
	if raw_json.to_utf8_buffer().size() > VOICES_MAX_BYTES:
		return {"ok": false}
	var trimmed := raw_json.strip_edges()
	if trimmed.is_empty() or not trimmed.begins_with("{") or not trimmed.ends_with("}"):
		return {"ok": false}
	var parsed: Variant = JSON.parse_string(trimmed)
	if not (parsed is Dictionary):
		return {"ok": false}
	var d: Dictionary = parsed
	var ver_val: Variant = d.get("version", -1)
	if not is_whole_json_number(ver_val) or int(roundf(float(ver_val))) != 1:
		return {"ok": false}
	var checked_val: Variant = d.get("checkedAt", "")
	if not (checked_val is String) or String(checked_val) != VOICES_CHECKED_AT:
		return {"ok": false}
	var list_val: Variant = d.get("records", null)
	if not (list_val is Array) or (list_val as Array).size() != 3:
		return {"ok": false}
	var req_keys := ["name", "topic", "summary", "sourceTitle"]
	var clean_records: Array[Dictionary] = []
	var seen_ids: Dictionary = {}
	for entry_val in (list_val as Array):
		if not (entry_val is Dictionary):
			return {"ok": false}
		var entry: Dictionary = entry_val
		var id_val: Variant = entry.get("id", null)
		var url_val: Variant = entry.get("url", null)
		if not (id_val is String) or not (url_val is String):
			return {"ok": false}
		var rec_id := String(id_val)
		var src_url := String(url_val)
		if not VOICES_SOURCES.has(rec_id) or seen_ids.has(rec_id) or src_url != String(VOICES_SOURCES[rec_id]):
			return {"ok": false}
		seen_ids[rec_id] = true
		var clean_rec: Dictionary = {"id": rec_id, "url": src_url}
		for k in req_keys:
			var v: Variant = entry.get(k, null)
			var max_len := 450 if k == "summary" else 100
			if not (v is String) or String(v).strip_edges().is_empty() or String(v).length() > max_len:
				return {"ok": false}
			clean_rec[k] = String(v)
		clean_records.append(clean_rec)
	return {"ok": true, "checked_at": String(checked_val), "records": clean_records}

func voices_release_resources() -> void:
	var t0 := Time.get_ticks_usec()
	voices_records.clear()
	voices_checked_at = ""
	voices_release_count += 1
	last_voices_teardown_usec = maxi(1, Time.get_ticks_usec() - t0)

func present_voices_summary() -> String:
	if not voices_enabled or voices_status != "ready" or voices_records.is_empty():
		return ""
	var card_lines: Array[String] = []
	for rec in voices_records:
		card_lines.append("%s (%s): %s [%s — %s]" % [
			String(rec.get("name", "")),
			String(rec.get("topic", "")),
			String(rec.get("summary", "")),
			String(rec.get("sourceTitle", "")),
			String(rec.get("url", ""))
		])
	var body := "People already doing the work (%d profiles checked %s): %s\n%s" % [
		voices_records.size(),
		voices_checked_at,
		" · ".join(card_lines),
		VOICES_DISCLAIMER
	]
	if info != null:
		info.text = "%s\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % body
	announce_a11y_status(body)
	return body

func load_voices_for_generation(gen: int, raw_override: String = "") -> bool:
	if not voices_enabled or gen != voices_generation:
		return false
	if is_test_suite_mode() and voices_simulate_error:
		voices_records.clear()
		voices_checked_at = ""
		voices_status = "error"
		voices_error = "Could not load neighborhood voices dataset."
		update_block_ui()
		sync_web_a11y_status()
		return false
	var raw_text := raw_override
	if raw_text.is_empty() and is_test_suite_mode():
		raw_text = voices_custom_json_override
	if raw_text.is_empty() and FileAccess.file_exists(VOICES_DATA_PATH):
		raw_text = FileAccess.get_file_as_string(VOICES_DATA_PATH)
	var val_res := validate_voices_payload(raw_text)
	if not bool(val_res.get("ok", false)):
		voices_records.clear()
		voices_checked_at = ""
		voices_status = "error"
		voices_error = "Neighborhood voices dataset failed validation."
		update_block_ui()
		sync_web_a11y_status()
		return false
	voices_records = val_res.get("records", [] as Array[Dictionary])
	voices_checked_at = String(val_res.get("checked_at", ""))
	voices_status = "ready"
	voices_error = ""
	update_block_ui()
	sync_web_a11y_status()
	return true

func set_voices_enabled(enabled_flag: bool, persist_setting: bool = true) -> bool:
	voices_generation += 1
	var gen := voices_generation
	voices_release_resources()
	voices_enabled = enabled_flag
	voices_suspended = false
	if not enabled_flag:
		voices_status = "off"
		voices_error = ""
		if persist_setting:
			save_godot_settings()
		update_block_ui()
		if persist_setting and info != null:
			var off_msg := "Experimental Neighborhood Voices: Off (default-off · game saves unaffected)."
			info.text = "%s\nSettings stored separately from game saves · Core gathering stays complete\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % off_msg
			announce_a11y_status(off_msg)
		else:
			sync_web_a11y_status()
		return false
	voices_status = "loading"
	voices_error = ""
	if persist_setting:
		save_godot_settings()
	var ok := load_voices_for_generation(gen)
	if persist_setting and info != null:
		if ok:
			present_voices_summary()
		else:
			var err_msg := "Experimental Neighborhood Voices error: %s" % voices_error
			info.text = "%s\nUse Retry (Shift+/) or switch Voices Off · Core gathering unaffected\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % err_msg
			announce_a11y_status(err_msg)
	return ok

func toggle_voices_enabled() -> bool:
	show_block_panel(true)
	return set_voices_enabled(not voices_enabled, true)

func retry_voices_load() -> bool:
	if not voices_enabled:
		return false
	voices_generation += 1
	var gen := voices_generation
	voices_release_resources()
	voices_suspended = false
	voices_status = "loading"
	voices_error = ""
	var ok := load_voices_for_generation(gen)
	if info != null:
		if ok:
			present_voices_summary()
		else:
			var msg := "Neighborhood Voices retry failed: %s" % voices_error
			info.text = "%s\nDefault-off optional shelf · Core gathering unaffected\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % msg
			announce_a11y_status(msg)
	return ok

func suspend_voices() -> bool:
	if not voices_enabled:
		return false
	var t0 := Time.get_ticks_usec()
	var had_error := (voices_status == "error" or not voices_error.is_empty())
	voices_generation += 1
	voices_release_resources()
	voices_suspended = true
	voices_status = "error" if had_error else "paused"
	update_block_ui()
	sync_web_a11y_status()
	last_voices_teardown_usec = maxi(1, Time.get_ticks_usec() - t0)
	return true

func resume_voices() -> bool:
	if not voices_enabled or voices_status != "paused":
		return false
	voices_suspended = false
	return retry_voices_load()

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_PAUSED or what == NOTIFICATION_WM_WINDOW_FOCUS_OUT or what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		suspend_voices()
	elif what == NOTIFICATION_APPLICATION_RESUMED or what == NOTIFICATION_WM_WINDOW_FOCUS_IN or what == NOTIFICATION_APPLICATION_FOCUS_IN:
		resume_voices()

func recompute_music_stems() -> void:
	var mask := 1 # "bass" always active
	if visited_neighbors.size() >= 1 or celeste_talk_count > 0 or rook_soundcheck_done:
		mask |= 2 # "brush"
	if mural_placements.size() >= 1 or celeste_talk_count > 0:
		mask |= 4 # "chords"
	if mural_completed or rook_soundcheck_done:
		mask |= 8 # "lead"
	unlocked_stem_mask = mask
	update_music_ui()

func unlocked_stems() -> Array[String]:
	var result: Array[String] = []
	for i in range(MUSIC_STEM_ORDER.size()):
		if (unlocked_stem_mask & (1 << i)) != 0:
			result.append(MUSIC_STEM_ORDER[i])
	return result

func active_stem_summary() -> String:
	var stems := unlocked_stems()
	return "%s (%d/%d stems)" % ["+".join(stems), stems.size(), MUSIC_STEM_ORDER.size()]

func trigger_progress_cue(cue_id: String, reason: String) -> void:
	recompute_music_stems()
	var stems := unlocked_stems()
	last_music_cue = cue_id
	cue_history.append({
		"id": cue_id,
		"reason": reason,
		"stems": stems.duplicate()
	})
	if cue_history.size() > 32:
		cue_history.pop_front()
	match cue_id:
		"mural_complete", "block_opened", "hosting_complete", "civic_complete", "film_complete":
			cue_arpeggio_freqs = [523.25, 659.25, 1046.50]
			cue_arpeggio_duration = 0.56
		"surprise_finale", "tour_complete":
			cue_arpeggio_freqs = [523.25, 659.25, 783.99, 1046.50]
			cue_arpeggio_duration = 0.68
		"history_comptons":
			cue_arpeggio_freqs = [523.25, 659.25, 880.00]
			cue_arpeggio_duration = 0.50
		"history_blackhawk", "so_what_egg":
			cue_arpeggio_freqs = [440.00, 523.25, 659.25, 783.99]
			cue_arpeggio_duration = 0.54
		"museum_portal", "boeddeker_park":
			cue_arpeggio_freqs = [523.25, 659.25, 783.99, 987.77]
			cue_arpeggio_duration = 0.52
		"rook_soundcheck", "surprise_discovery":
			if reason == "mayor_pomp_event":
				cue_arpeggio_freqs = [392.00, 493.88, 587.33]
				cue_arpeggio_duration = 0.62
			elif reason == "clown_horn_walker":
				cue_arpeggio_freqs = [440.00, 554.37, 659.25]
				cue_arpeggio_duration = 0.42
			else:
				cue_arpeggio_freqs = [659.25, 830.61, 987.77]
				cue_arpeggio_duration = 0.48
		"mural_motif", "keepsake_photo", "programme_published", "film_shot", "eatery_order":
			cue_arpeggio_freqs = [587.33, 739.99, 880.00]
			cue_arpeggio_duration = 0.44
		_:
			cue_arpeggio_freqs = [523.25, 659.25, 783.99]
			cue_arpeggio_duration = 0.40
	if not suppress_feel_good_burst:
		var burst_title := ""
		var burst_detail := ""
		var burst_pos: Vector3 = player.position if player != null else Vector3(71.5, 0.0, 26.8)
		var burst_accent := Color("ffd45e")
		match cue_id:
			"neighbor_visit":
				burst_title = "New Neighbor Connected — %s" % reason
				burst_detail = "Neighbors Met: %d/%d · Groove: %s" % [visited_neighbors.size(), neighbors.size(), active_stem_summary()]
				var matched_n_idx := arrived_neighbor
				for n_k in range(neighbors.size()):
					if String(neighbors[n_k].get("name", "")) == reason:
						matched_n_idx = n_k
						break
				if matched_n_idx >= 0 and matched_n_idx < neighbors.size():
					burst_pos = neighbors[matched_n_idx].pos
					burst_accent = Color(neighbors[matched_n_idx].coat).lightened(0.28)
			"celeste_talk":
				burst_title = "Artist Spark — Connected with Celeste"
				burst_detail = "Sidewalk easel unlocked (%d/%d neighbors met)" % [visited_neighbors.size(), neighbors.size()]
				burst_pos = MURAL_POS
				burst_accent = Color("ffb84d")
			"mural_motif":
				burst_title = "Mural Spark — Painted %s Motif" % reason.capitalize()
				burst_detail = "Easel progress: %d/3 motifs · Groove: %s" % [mural_placements.size(), active_stem_summary()]
				burst_pos = MURAL_POS
				burst_accent = Color("ff9e5e")
			"mural_complete":
				burst_title = "Mural Complete — All 3 Motifs Shining!"
				burst_detail = "Harmonic pad stem unlocked · Groove: %s" % active_stem_summary()
				burst_pos = MURAL_POS
				burst_accent = Color("ffd45e")
			"rook_soundcheck":
				burst_title = "Soundcheck Locked In — Sidewalk Lead Stem Live!"
				burst_detail = "Rook dialed in the corner speaker · %s" % active_stem_summary()
				burst_pos = ROOK_SPEAKER_POS
				burst_accent = Color("6ec6ff")
			"block_opened":
				burst_title = "Turk Street Block Gathering Open!"
				burst_detail = "String lights, music, and neighbors fill the sidewalk"
				burst_pos = MURAL_POS
				burst_accent = Color("ffe066")
			"keepsake_photo":
				burst_title = "Keepsake Moment — Group Photo Captured!"
				burst_detail = "Press Shift+Y anytime to export your block keepsake SVG"
				burst_pos = MURAL_POS
				burst_accent = Color("ff8ad8")
			"loan_returned":
				burst_title = "Neighbor Care — Returned %s" % reason.capitalize()
				burst_detail = "Borrowed gear returned (%d/3)" % epilogue_returned.size()
				burst_accent = Color("9ef5e5")
			"programme_published":
				burst_title = "Evening Programme Published!"
				burst_detail = "All 4 block gathering segments scheduled on the board"
				burst_accent = Color("ffd45e")
			"hosting_segment":
				burst_title = "Hosted Block Activity — %s" % reason
				burst_detail = "Block hosting progress: %d/4 activities" % hosting_results.size()
				burst_accent = Color("ffb84d")
			"hosting_complete":
				burst_title = "All 4 Block Gathering Events Hosted!"
				burst_detail = "Tenant circle (Q) and neighborhood short film (.) unlocked"
				burst_accent = Color("ffe066")
			"civic_complete":
				burst_title = "Tenant Listening Circle Complete!"
				burst_detail = "Every neighbor heard · 'The Open Seat' film short (.) unlocked · Sparks: %d" % spark_count()
				burst_pos = (civic_setup_node.position if civic_setup_node != null else neighbors[0].pos) + Vector3.UP * 1.8
				burst_accent = Color("d9a2b2")
			"film_shot":
				burst_title = "Film Frame Captured — %s" % film_shot_title(reason)
				burst_detail = "The Open Seat: %d/3 frames captured" % film_captured.size()
				burst_pos = (film_storyboard_node.position if film_storyboard_node != null else MURAL_POS) + Vector3.UP * 1.8
				burst_accent = Color("91bac2")
			"film_complete":
				burst_title = "Short Film Complete — The Open Seat (3/3)!"
				burst_detail = "All 3 storyboard frames captured · Sparks: %d" % spark_count()
				burst_pos = (film_storyboard_node.position if film_storyboard_node != null else MURAL_POS) + Vector3.UP * 1.8
				burst_accent = Color("ffe066")
			"history_comptons":
				burst_title = "Living History — %s" % reason
				burst_detail = "1966 Compton's Cafeteria Riot plaque at Turk & Taylor · Sparks: %d" % spark_count()
				burst_pos = history_stop_pos_3d("comptons") + Vector3.UP * 1.8
				burst_accent = Color("f5a3d0")
			"history_blackhawk":
				burst_title = "Jazz History — %s" % reason
				burst_detail = "1949–63 Black Hawk jazz club site at Turk & Hyde · Sparks: %d" % spark_count()
				burst_pos = history_stop_pos_3d("blackhawk") + Vector3.UP * 1.8
				burst_accent = Color("6ec6ff")
			"museum_portal":
				burst_title = "Archive Time-Portal — %s" % reason
				burst_detail = "398 Eddy St (Cadillac Hotel, 1907) · Session era %d/4" % visited_museum_eras.size()
				burst_pos = MUSEUM_HUB_POS + Vector3.UP * 2.2
				burst_accent = Color("7be0e6")
			"tour_complete":
				burst_title = "Neighborhood Tour Complete!"
				var tour := landmark_tour_state()
				burst_detail = "%d/%d stops · 10 keepsakes\nThanks for exploring!" % [tour.count, tour.total]
				burst_pos = target + Vector3.UP * 1.8
				burst_accent = Color("ffe066")
			"boeddeker_park":
				burst_title = "Neighborhood Green — Boeddeker Park"
				burst_detail = "240 Eddy St at Jones · %d shade trees, lawn & play area" % boeddeker_tree_points.size()
				burst_pos = BOEDDEKER_VIEW_TARGET
				burst_accent = Color("7ce8b0")
			"so_what_egg":
				burst_title = "Found 'So What'!"
				burst_detail = "8th-floor corner bay window & 1961 Miles Davis awning"
				burst_pos = SO_WHAT_VIEW_TARGET
				burst_accent = Color("ffd45e")
		if not burst_title.is_empty() or cue_id in ["surprise_discovery", "surprise_finale", "eatery_order"]:
			play_reward_sound(cue_id)
		if not burst_title.is_empty():
			trigger_feel_good_burst(burst_title, burst_detail, burst_pos, burst_accent, cue_id in ["mural_complete", "block_opened", "hosting_complete", "civic_complete", "film_complete", "surprise_finale", "tour_complete"])
	update_music_ui()

func apply_music_volume_db() -> void:
	var db := -80.0 if music_volume <= 0.0001 else linear_to_db(music_volume)
	if sketch_player != null:
		sketch_player.volume_db = db
	if local_audio_player != null:
		local_audio_player.volume_db = db
	if music_playing and music_mode == "sketch":
		last_sample_rms = last_pre_gain_rms * music_volume
	else:
		last_sample_rms = 0.0

func start_music_playback() -> bool:
	music_playing = true
	var has_audio_device := AudioServer.get_driver_name() != "Dummy"
	if music_mode == "local" and local_audio_player != null and local_audio_player.stream != null:
		if sketch_player != null and sketch_player.playing:
			sketch_player.stop()
		sketch_playback = null
		apply_music_volume_db()
		if has_audio_device:
			local_audio_player.play()
		last_pre_gain_rms = 0.0
		last_sample_rms = 0.0
	else:
		music_mode = "sketch"
		if local_audio_player != null and local_audio_player.playing:
			local_audio_player.stop()
		apply_music_volume_db()
		if sketch_player != null and has_audio_device:
			if not sketch_player.playing:
				sketch_player.play()
			sketch_playback = sketch_player.get_stream_playback() as AudioStreamGeneratorPlayback
			if sketch_playback != null:
				advance_music_clock(sketch_generator.buffer_length)
	update_speaker_3d()
	update_music_ui()
	var mode_tag := ("Local: " + local_music_name) if music_mode == "local" else ("80 BPM Sketch (" + active_stem_summary() + ")")
	announce_a11y_status("Music playing: %s." % mode_tag)
	return music_playing

func stop_music_playback() -> void:
	music_playing = false
	if sketch_player != null and sketch_player.playing:
		sketch_player.stop()
	if local_audio_player != null and local_audio_player.playing:
		local_audio_player.stop()
	sketch_playback = null
	last_pre_gain_rms = 0.0
	last_sample_rms = 0.0
	update_speaker_3d()
	update_music_ui()

func toggle_music_playback() -> bool:
	if music_playing:
		stop_music_playback()
		announce_a11y_status("Music paused.")
		return false
	return start_music_playback()

func cycle_music_volume() -> float:
	var best_idx := 0
	var best_diff := INF
	for i in range(MUSIC_VOL_STEPS.size()):
		var d := absf(MUSIC_VOL_STEPS[i] - music_volume)
		if d < best_diff:
			best_diff = d
			best_idx = i
	music_volume = MUSIC_VOL_STEPS[posmod(best_idx + 1, MUSIC_VOL_STEPS.size())]
	apply_music_volume_db()
	update_music_ui()
	announce_a11y_status("Music volume %d%%." % int(round(music_volume * 100.0)))
	return music_volume

func advance_music_clock(delta: float) -> int:
	if not music_playing or delta <= 0.0:
		return 0
	var has_audio_device := AudioServer.get_driver_name() != "Dummy"
	if music_mode == "local":
		if has_audio_device and local_audio_player != null and local_audio_player.stream != null and not local_audio_player.playing:
			local_audio_player.play()
		last_pre_gain_rms = 0.0
		last_sample_rms = 0.0
		return 0
	if has_audio_device and sketch_playback == null and sketch_player != null and sketch_player.playing:
		sketch_playback = sketch_player.get_stream_playback() as AudioStreamGeneratorPlayback
	var frames_to_gen := 0
	if sketch_playback != null:
		frames_to_gen = sketch_playback.get_frames_available()
	else:
		frames_to_gen = maxi(1, int(round(delta * MUSIC_MIX_RATE)))
	if frames_to_gen <= 0:
		last_sample_rms = last_pre_gain_rms * music_volume
		return 0
	var bass_freqs: Array[float] = [110.0, 110.0, 130.81, 98.0, 123.47, 123.47, 146.83, 98.0]
	var lead_freqs: Array[float] = [440.0, 523.25, 587.33, 659.25, 587.33, 523.25, 493.88, 392.0]
	var inv_rate := 1.0 / MUSIC_MIX_RATE
	var samples_per_step := maxi(1, int(round(MUSIC_STEP_SEC * MUSIC_MIX_RATE)))
	var sum_sq := 0.0
	for i in range(frames_to_gen):
		var sample_idx := sketch_frames_pushed + i
		var t := float(sample_idx) * inv_rate
		var step_total := int(sample_idx / samples_per_step)
		var step_idx := posmod(step_total, 8)
		var step_t := float(sample_idx % samples_per_step) * inv_rate
		var c0 := 220.0 if step_idx < 4 else 196.0
		var c1 := 261.63 if step_idx < 4 else 246.94
		var c2 := 329.63 if step_idx < 4 else 293.66
		var bass_f: float = bass_freqs[step_idx]
		var lead_f: float = lead_freqs[step_idx]
		var sig := sin(TAU * bass_f * t) * 0.24 + sin(TAU * bass_f * 2.0 * t) * 0.08
		if (unlocked_stem_mask & 2) != 0:
			var env := exp(-step_t * 14.0)
			sig += sin(TAU * 910.0 * t) * cos(TAU * 1430.0 * t) * env * 0.10
		if (unlocked_stem_mask & 4) != 0:
			var c_sig := (sin(TAU * c0 * t) + sin(TAU * c1 * t) + sin(TAU * c2 * t)) / 3.0
			sig += c_sig * 0.16
		if (unlocked_stem_mask & 8) != 0:
			sig += sin(TAU * lead_f * t + sin(TAU * 5.0 * t) * 0.25) * 0.14
		var sample := clampf(sig, -0.95, 0.95)
		sum_sq += sample * sample
		if sketch_playback != null:
			sketch_playback.push_frame(Vector2(sample, sample))
	sketch_frames_pushed += frames_to_gen
	sketch_phase = fmod(float(sketch_frames_pushed) * inv_rate, 60.0)
	sketch_tick = int(sketch_frames_pushed / samples_per_step)
	last_pre_gain_rms = sqrt(sum_sq / float(frames_to_gen))
	last_sample_rms = last_pre_gain_rms * music_volume
	return frames_to_gen

func parse_wav_stream(raw_bytes: PackedByteArray) -> AudioStreamWAV:
	if raw_bytes.size() < 44:
		return null
	if raw_bytes.slice(0, 4).get_string_from_ascii() != "RIFF":
		return null
	if raw_bytes.slice(8, 12).get_string_from_ascii() != "WAVE":
		return null
	var offset := 12
	var fmt_found := false
	var audio_format := 0
	var channels := 0
	var sample_rate := 0
	var bits_per_sample := 0
	var data_offset := -1
	var data_size := 0
	while offset + 8 <= raw_bytes.size():
		var chunk_id := raw_bytes.slice(offset, offset + 4).get_string_from_ascii()
		var chunk_size := int(raw_bytes.decode_u32(offset + 4))
		var chunk_body := offset + 8
		if chunk_body + chunk_size > raw_bytes.size():
			return null
		if chunk_id == "fmt ":
			if chunk_size < 16:
				return null
			audio_format = int(raw_bytes.decode_u16(chunk_body))
			channels = int(raw_bytes.decode_u16(chunk_body + 2))
			sample_rate = int(raw_bytes.decode_u32(chunk_body + 4))
			bits_per_sample = int(raw_bytes.decode_u16(chunk_body + 14))
			fmt_found = true
		elif chunk_id == "data":
			data_offset = chunk_body
			data_size = chunk_size
			break
		offset = chunk_body + chunk_size + (chunk_size % 2)
	if not fmt_found or data_offset < 0 or data_size <= 0:
		return null
	if audio_format != 1 or (channels != 1 and channels != 2):
		return null
	if bits_per_sample != 8 and bits_per_sample != 16:
		return null
	if sample_rate < 4000 or sample_rate > 96000:
		return null
	var frame_bytes := channels * int(bits_per_sample / 8)
	if frame_bytes <= 0 or data_size < frame_bytes:
		return null
	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS if bits_per_sample == 16 else AudioStreamWAV.FORMAT_8_BITS
	wav.mix_rate = sample_rate
	wav.stereo = (channels == 2)
	wav.data = raw_bytes.slice(data_offset, data_offset + data_size)
	wav.loop_mode = AudioStreamWAV.LOOP_FORWARD
	wav.loop_begin = 0
	wav.loop_end = int(data_size / frame_bytes)
	return wav

func is_plausible_mp3(raw_bytes: PackedByteArray) -> bool:
	if raw_bytes.size() < 16:
		return false
	var offset := 0
	if raw_bytes[0] == 0x49 and raw_bytes[1] == 0x44 and raw_bytes[2] == 0x33:
		if raw_bytes[3] == 0xFF or raw_bytes[4] == 0xFF:
			return false
		for b_i in range(6, 10):
			if raw_bytes[b_i] >= 0x80:
				return false
		var tag_size := (int(raw_bytes[6]) << 21) | (int(raw_bytes[7]) << 14) | (int(raw_bytes[8]) << 7) | int(raw_bytes[9])
		offset = 10 + tag_size
	if offset + 4 > raw_bytes.size():
		return false
	if raw_bytes[offset] != 0xFF or (raw_bytes[offset + 1] & 0xE0) != 0xE0:
		return false
	var ver_bits := (raw_bytes[offset + 1] >> 3) & 0x03
	var layer_bits := (raw_bytes[offset + 1] >> 1) & 0x03
	var br_idx := (raw_bytes[offset + 2] >> 4) & 0x0F
	var sr_idx := (raw_bytes[offset + 2] >> 2) & 0x03
	return ver_bits != 0x01 and layer_bits != 0x00 and br_idx != 0x00 and br_idx != 0x0F and sr_idx != 0x03

func is_plausible_ogg_vorbis(raw_bytes: PackedByteArray) -> bool:
	if raw_bytes.size() < 64:
		return false
	if raw_bytes.slice(0, 4).get_string_from_ascii() != "OggS" or raw_bytes[4] != 0:
		return false
	if raw_bytes[28] != 1 or raw_bytes.slice(29, 35).get_string_from_ascii() != "vorbis":
		return false
	var channels := int(raw_bytes[39])
	var sr := int(raw_bytes.decode_u32(40))
	if channels < 1 or channels > 8 or sr < 4000 or sr > 192000:
		return false
	var second_page := raw_bytes.slice(58, raw_bytes.size()).get_string_from_ascii().find("OggS")
	return second_page >= 0

func load_local_music_bytes(file_name: String, raw_bytes: PackedByteArray) -> bool:
	var clean_name := file_name.get_file().strip_edges()
	var ext := clean_name.get_extension().to_lower()
	if clean_name.is_empty() or not (ext in ["mp3", "wav", "ogg"]):
		music_error = MUSIC_FILE_ERROR
		update_music_ui()
		announce_a11y_status(MUSIC_FILE_ERROR)
		return false
	if raw_bytes.is_empty() or raw_bytes.size() > MUSIC_MAX_LOCAL_BYTES:
		music_error = MUSIC_FILE_ERROR
		update_music_ui()
		announce_a11y_status(MUSIC_FILE_ERROR)
		return false
	var stream: AudioStream = null
	if ext == "wav":
		stream = parse_wav_stream(raw_bytes)
	elif ext == "mp3":
		if is_plausible_mp3(raw_bytes):
			var mp3 := AudioStreamMP3.new()
			mp3.data = raw_bytes
			mp3.loop = true
			if mp3.get_length() > 0.0:
				stream = mp3
	elif ext == "ogg":
		if is_plausible_ogg_vorbis(raw_bytes):
			var ogg := AudioStreamOggVorbis.load_from_buffer(raw_bytes)
			if ogg != null and ogg.get_length() > 0.0:
				ogg.loop = true
				stream = ogg
	if stream == null:
		music_error = MUSIC_DECODE_ERROR
		update_music_ui()
		announce_a11y_status(MUSIC_DECODE_ERROR)
		return false
	if local_audio_player != null:
		local_audio_player.stream = stream
	local_music_name = clean_name
	music_mode = "local"
	music_error = ""
	start_music_playback()
	trigger_progress_cue("local_audition", clean_name)
	info.text = "Auditioning local track: %s (Rook's Turk St speaker)\nTab-local only — never uploaded or saved · Use Sketch to return\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % clean_name
	announce_a11y_status("Auditioning local track %s." % clean_name)
	return true

func use_synth_sketch() -> void:
	music_error = ""
	music_mode = "sketch"
	if local_audio_player != null and local_audio_player.playing:
		local_audio_player.stop()
	if music_playing:
		start_music_playback()
	else:
		update_speaker_3d()
		update_music_ui()
	info.text = "Switched Rook's Turk St Speaker to 80 BPM Synth Sketch (%s)\nExplicit Play/Pause below · Load Suno File for local audition\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % active_stem_summary()
	announce_a11y_status("Switched Rook's Speaker to 80 BPM Synth Sketch (%s)." % active_stem_summary())

func setup_web_audio_bridge() -> void:
	if not OS.has_feature("web"):
		return
	var js_init := """
	(function() {
		if (window.__tenderloinWebAudioReady) return;
		window.__tenderloinWebAudioReady = true;
		// Single pending-file slot: a new selection before the next frame poll replaces the prior slot.
		window.__tenderloinWebAudioPending = null;
		window.__tenderloinQueueLocalAudioBytes = function(name, bytes, err) {
			var u8 = (bytes instanceof Uint8Array) ? bytes : (bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : new Uint8Array(0));
			window.__tenderloinWebAudioPending = { name: String(name || ''), bytes: u8, err: String(err || '') };
			return true;
		};
		window.__tenderloinQueueLocalAudioBase64 = function(name, b64, err) {
			var u8 = new Uint8Array(0);
			if (b64) {
				try {
					var bin = window.atob(String(b64));
					u8 = new Uint8Array(bin.length);
					for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
				} catch (_e) {
					return window.__tenderloinQueueLocalAudioBytes(name, new Uint8Array(0), err || 'decode');
				}
			}
			return window.__tenderloinQueueLocalAudioBytes(name, u8, err);
		};
		var input = document.createElement('input');
		input.type = 'file';
		input.id = 'tenderloin-godot-audio-input';
		input.accept = '.mp3,.wav,.ogg,audio/mpeg,audio/wav,audio/ogg';
		input.style.display = 'none';
		input.addEventListener('change', function() {
			var f = input.files && input.files[0];
			if (!f) return;
			if (f.size <= 0 || f.size > 40 * 1024 * 1024) {
				window.__tenderloinQueueLocalAudioBytes(f.name, new Uint8Array(0), 'size');
				input.value = '';
				return;
			}
			var reader = new FileReader();
			reader.onload = function() {
				var buf = reader.result instanceof ArrayBuffer ? new Uint8Array(reader.result) : new Uint8Array(0);
				window.__tenderloinQueueLocalAudioBytes(f.name, buf, '');
				input.value = '';
			};
			reader.onerror = function() {
				window.__tenderloinQueueLocalAudioBytes(f.name, new Uint8Array(0), 'read');
				input.value = '';
			};
			reader.readAsArrayBuffer(f);
		});
		document.body.appendChild(input);
		window.__tenderloinOpenAudioPicker = function() {
			input.click();
			return true;
		};
	})();
	"""
	JavaScriptBridge.eval(js_init, true)

func setup_web_a11y_bridge() -> void:
	if not OS.has_feature("web"):
		return
	var js_a11y := """
	(function() {
		if (window.__tenderloinWebA11yReady) return;
		window.__tenderloinWebA11yReady = true;
		window.addEventListener('contextmenu', function(e) { e.preventDefault(); });
		var srStyle = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
		var live = document.getElementById('godot-a11y-status');
		if (!live) {
			live = document.createElement('div');
			live.id = 'godot-a11y-status';
			live.setAttribute('role', 'status');
			live.setAttribute('aria-live', 'polite');
			live.setAttribute('aria-atomic', 'true');
			live.style.cssText = srStyle;
			document.body.appendChild(live);
		}
		var summary = document.getElementById('godot-a11y-summary');
		if (!summary) {
			summary = document.createElement('div');
			summary.id = 'godot-a11y-summary';
			summary.setAttribute('role', 'region');
			summary.setAttribute('aria-label', 'Tenderloin Block Status');
			summary.style.cssText = srStyle;
			document.body.appendChild(summary);
		}
		window.__tenderloinGodotA11ySnapshot = null;
		window.__tenderloinLastA11ySeq = 0;
		window.__tenderloinUpdateA11yDOM = function(payloadJson) {
			try {
				var data = JSON.parse(payloadJson);
				window.__tenderloinGodotA11ySnapshot = data;
				var l = document.getElementById('godot-a11y-status');
				if (l && data.announcement && data.seq !== window.__tenderloinLastA11ySeq) {
					window.__tenderloinLastA11ySeq = data.seq;
					l.textContent = (l.textContent === data.announcement) ? (data.announcement + '\\u00a0') : data.announcement;
				}
				var s = document.getElementById('godot-a11y-summary');
				if (s) {
					var progLen = Array.isArray(data.programme_published) ? data.programme_published.length : 0;
					var hostCur = data.hosting_current ? (" (" + data.hosting_current + ")") : "";
					var voicesTag = data.voices_enabled ? ("On:" + (data.voices_status || "ready")) : "Off";
					s.textContent = "Neighbors " + data.visited_count + "/5 · Mural " + data.mural_count + "/3 (" + data.mural_palette + ") · Soundcheck " + (data.soundcheck_done ? "Done" : "Pending") + " · Block " + (data.block_opened ? "Opened" : (data.block_ready ? "Ready" : "In progress")) + " · Compton's " + (data.history_read ? "Read" : "Unread") + " · Black Hawk " + (data.blackhawk_discovered ? "Found" : "Unvisited") + " · District " + (data.district_boundary_visible ? "Shown" : "Hidden") + " · Keepsake " + (data.keepsake_status || "unasked") + " · Loans " + (data.loans_returned_count || 0) + "/3 · Programme " + progLen + "/4 · Hosted " + (data.hosting_completed_count || 0) + "/4" + hostCur + " · Civic " + (data.civic_phase || "idle") + " · Film " + (data.film_phase || "idle") + " (" + (data.film_captured_count || 0) + "/3) · Voices " + voicesTag;
					s.textContent += " · Surprise keepsakes " + data.keepsakes_visible + "/10 · Optional tour " + data.tour_count + "/" + data.tour_total + " this session · Next: " + data.objective_text;
				}
				return true;
			} catch (_e) {
				return false;
			}
		};
		window.__tenderloinWebVoicesLifecyclePending = '';
		window.addEventListener('pagehide', function() {
			window.__tenderloinWebVoicesLifecyclePending = 'suspend';
			if (window.__tenderloinLastExportUrl) {
				try { URL.revokeObjectURL(window.__tenderloinLastExportUrl); } catch (_e) {}
				window.__tenderloinLastExportUrl = '';
			}
		});
		window.addEventListener('pageshow', function(e) {
			if (e && e.persisted) {
				window.__tenderloinWebVoicesLifecyclePending = 'resume';
			}
		});
		window.__tenderloinWebSavePending = null;
		window.__tenderloinQueueBrowserSaveJson = function(rawText, errMsg) {
			window.__tenderloinWebSavePending = {
				raw: String(rawText || ''),
				err: String(errMsg || '')
			};
			return true;
		};
		var saveInput = document.getElementById('tenderloin-godot-save-input');
		if (!saveInput) {
			saveInput = document.createElement('input');
			saveInput.type = 'file';
			saveInput.id = 'tenderloin-godot-save-input';
			saveInput.accept = '.json,application/json';
			saveInput.style.display = 'none';
			saveInput.addEventListener('change', function() {
				var f = saveInput.files && saveInput.files[0];
				if (!f) return;
				if (f.size <= 0 || f.size > %d) {
					window.__tenderloinQueueBrowserSaveJson('', 'size');
					saveInput.value = '';
					return;
				}
				var reader = new FileReader();
				reader.onload = function() {
					window.__tenderloinQueueBrowserSaveJson(typeof reader.result === 'string' ? reader.result : '', '');
					saveInput.value = '';
				};
				reader.onerror = function() {
					window.__tenderloinQueueBrowserSaveJson('', 'read');
					saveInput.value = '';
				};
				reader.readAsText(f);
			});
			document.body.appendChild(saveInput);
		}
		window.__tenderloinOpenSavePicker = function() {
			saveInput.click();
			return true;
		};
		window.__tenderloinLastExportedSvg = null;
		window.__tenderloinLastExportUrl = '';
		window.__tenderloinExportKeepsakeSvg = function(svgText, fileName) {
			var cleanSvg = String(svgText || '');
			var cleanName = String(fileName || 'tenderloin-redux-godot-afternoon.svg');
			if (!cleanSvg) return false;
			var utf8Bytes = (typeof TextEncoder !== 'undefined') ? (new TextEncoder().encode(cleanSvg).length) : cleanSvg.length;
			window.__tenderloinLastExportedSvg = {
				filename: cleanName,
				svg: cleanSvg,
				bytes: utf8Bytes
			};
			if (!window.__tenderloinSuppressDownload) {
				try {
					if (window.__tenderloinLastExportUrl) {
						URL.revokeObjectURL(window.__tenderloinLastExportUrl);
						window.__tenderloinLastExportUrl = '';
					}
					var blob = new Blob([cleanSvg], { type: 'image/svg+xml;charset=utf-8' });
					var url = URL.createObjectURL(blob);
					window.__tenderloinLastExportUrl = url;
					var a = document.createElement('a');
					a.href = url;
					a.download = cleanName;
					a.style.display = 'none';
					document.body.appendChild(a);
					a.click();
					document.body.removeChild(a);
				} catch (_e) {}
			}
			return true;
		};
		window.__tenderloinLastPerfSnapshot = null;
		window.__tenderloinWebPerfRequestPending = false;
		window.__tenderloinRequestPerfSnapshot = function() {
			window.__tenderloinLastPerfSnapshot = null;
			window.__tenderloinWebPerfRequestPending = true;
			return true;
		};
	})();
	""" % BROWSER_SAVE_MAX_BYTES
	JavaScriptBridge.eval(js_a11y, true)

func measure_local_performance() -> Dictionary:
	var saved_walk_cache := cell_walkable_cache.duplicate()
	cell_walkable_cache.clear()
	var t_path0 := Time.get_ticks_usec()
	var bh_path := find_path(neighbor_xz(4), blackhawk_xz())
	var path_usec := maxi(1, Time.get_ticks_usec() - t_path0)
	var path_astar_cells := last_astar_expanded_cells
	cell_walkable_cache = saved_walk_cache
	var t_save0 := Time.get_ticks_usec()
	var env := build_save_envelope()
	var raw_json := JSON.stringify(env)
	var parsed_back: Variant = JSON.parse_string(raw_json)
	var save_usec := maxi(1, Time.get_ticks_usec() - t_save0)
	var save_bytes := raw_json.to_utf8_buffer().size()
	var save_parse_ok := (parsed_back is Dictionary) and String((parsed_back as Dictionary).get("schema", "")) == "tenderloin-redux.godot.save"
	var teardown_measured := last_voices_teardown_usec > 0
	var teardown_usec := last_voices_teardown_usec if teardown_measured else -1
	var teardown_budget_ok := (not teardown_measured) or (teardown_usec < VOICES_TEARDOWN_BUDGET_MAX_USEC)
	var street_count := int((data.get("streets", []) as Array).size())
	var wider_street_count := street_ways.size()
	var district_ok := district_boundary_node != null and district_boundary_node.mesh != null
	var budget_ok := (
		meshes.size() == 58
		and wider_meshes.size() == 130
		and all_buildings.size() == 188
		and street_count == 20
		and wider_street_count == 41
		and district_ok
		and bh_path.size() >= 2
		and path_astar_cells > 0
		and path_usec < PATHFIND_BUDGET_MAX_USEC
		and save_parse_ok
		and save_bytes > 0
		and save_bytes <= SAVE_BUDGET_MAX_BYTES
		and save_usec < SAVE_SERIALIZE_BUDGET_MAX_USEC
		and teardown_budget_ok
	)
	return {
		"opening_buildings_count": meshes.size(),
		"wider_buildings_count": wider_meshes.size(),
		"total_buildings_count": all_buildings.size(),
		"street_ways_count": street_count,
		"wider_street_ways_count": wider_street_count,
		"district_boundary_present": district_ok,
		"pathfind_blackhawk_waypoints": bh_path.size(),
		"pathfind_blackhawk_usec": path_usec,
		"pathfind_budget_max_usec": PATHFIND_BUDGET_MAX_USEC,
		"pathfind_cold_cache": true,
		"astar_used": path_astar_cells > 0,
		"astar_expanded_cells": path_astar_cells,
		"save_bytes": save_bytes,
		"save_budget_max_bytes": SAVE_BUDGET_MAX_BYTES,
		"save_roundtrip_usec": save_usec,
		"save_budget_max_usec": SAVE_SERIALIZE_BUDGET_MAX_USEC,
		"voices_teardown_measured": teardown_measured,
		"voices_teardown_usec": teardown_usec,
		"voices_teardown_budget_max_usec": VOICES_TEARDOWN_BUDGET_MAX_USEC,
		"object_node_count": int(Performance.get_monitor(Performance.OBJECT_NODE_COUNT)),
		"svg_samples": {
			"keepsake": build_keepsake_svg({
				"status": "taken",
				"participants": ["bea", "celeste", "dez", "thanh"],
				"mural": {"sun": {"col": 0, "row": 0}, "wave": {"col": 2, "row": 1}, "rise": {"col": 4, "row": 2}},
				"palette": "garden",
				"layout": "table"
			}),
			"programme": build_programme_svg(["stories", "beats", "pause", "art"]),
			"tile_panel": build_tile_panel_svg({"palette": "warm", "tiles": [0, 1, 2, 2, 1, 0]}),
			"civic_plan": build_civic_plan_svg({"topic": "repairs", "format": "circle", "notes": "themes"}),
			"film_frame": build_film_frame_svg({"framing": "close", "plan": "quiet", "order": ["seat", "paint", "welcome"]}, "seat")
		},
		"within_budget": budget_ok
	}

func block_action_snapshots() -> Array[Dictionary]:
	var actions: Array[Dictionary] = []
	for i in range(mini(BLOCK_ACTION_COUNT, block_buttons.size())):
		var btn := block_buttons[i]
		if btn.is_visible_in_tree():
			var entry := control_snapshot(btn)
			entry["id"] = i
			entry["text"] = btn.text
			var style := btn.get_theme_stylebox("normal")
			var text_box := btn.size - style.get_minimum_size()
			var text_size := btn.get_theme_font("font").get_multiline_string_size(btn.text, HORIZONTAL_ALIGNMENT_CENTER, text_box.x, btn.get_theme_font_size("font_size"), -1, TextServer.BREAK_MANDATORY | TextServer.BREAK_WORD_BOUND | TextServer.BREAK_ADAPTIVE)
			entry["text_fits"] = text_size.y <= text_box.y + 1.0 and text_size.x <= text_box.x + 1.0
			actions.append(entry)
	return actions

func control_snapshot(control: Control) -> Dictionary:
	if control == null:
		return {}
	var rect := control.get_global_rect()
	var result := {"x": rect.position.x, "y": rect.position.y, "width": rect.size.x, "height": rect.size.y, "visible": control.is_visible_in_tree()}
	if control is BaseButton:
		result["disabled"] = (control as BaseButton).disabled
	return result

func walking_control_snapshots() -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	if controls == null:
		return result
	for child in controls.get_children():
		var btn := child as Button
		var entry := control_snapshot(btn)
		entry["text"] = btn.text
		entry["text_fits"] = btn.get_theme_font("font").get_string_size(btn.text, HORIZONTAL_ALIGNMENT_LEFT, -1, btn.get_theme_font_size("font_size")).x + btn.get_theme_stylebox("normal").get_minimum_size().x <= btn.size.x + 1.0
		result.append(entry)
	return result

func panel_subject_snapshots() -> Array[Dictionary]:
	var positions: Array[Vector3] = []
	if mural_panel != null and mural_panel.visible:
		positions = [neighbors[celeste_index].pos + Vector3.UP, MURAL_POS + Vector3.UP]
	elif music_panel != null and music_panel.visible:
		positions = [neighbors[rook_index].pos + Vector3.UP, ROOK_SPEAKER_POS + Vector3.UP]
	elif block_panel != null and block_panel.visible and block_panel_mode == "talk" and talk_partner >= 0:
		positions = [neighbors[talk_partner].pos + Vector3.UP]
	var result: Array[Dictionary] = []
	for pos in positions:
		var screen := camera.unproject_position(pos)
		result.append({"x": screen.x, "y": screen.y, "behind": camera.is_position_behind(pos)})
	return result

func activity_detail_snapshot(detail: RichTextLabel, panel: Control, buttons: Array[Button]) -> Dictionary:
	if detail == null or panel == null:
		return {}
	var actions: Array[Dictionary] = []
	for i in range(buttons.size() if panel.is_visible_in_tree() else 0):
		var btn := buttons[i]
		var entry := control_snapshot(btn)
		entry["id"] = i
		entry["text"] = btn.text
		var box := btn.size - btn.get_theme_stylebox("normal").get_minimum_size()
		var measured := btn.get_theme_font("font").get_multiline_string_size(btn.text, HORIZONTAL_ALIGNMENT_CENTER, box.x if btn.autowrap_mode != TextServer.AUTOWRAP_OFF else -1.0, btn.get_theme_font_size("font_size"), -1, TextServer.BREAK_MANDATORY | TextServer.BREAK_WORD_BOUND | TextServer.BREAK_ADAPTIVE)
		entry["text_fits"] = measured.x <= box.x + 1.0 and measured.y <= box.y + 1.0
		actions.append(entry)
	var bar := detail.get_v_scroll_bar()
	return {"control": control_snapshot(detail), "panel": control_snapshot(panel), "text": detail.text, "min_height": detail.custom_minimum_size.y, "scroll_value": bar.value, "scroll_max": bar.max_value, "scroll_page": bar.page, "buttons": actions}

func rect_snapshot(rect: Rect2) -> Dictionary:
	return {"x": rect.position.x, "y": rect.position.y, "width": rect.size.x, "height": rect.size.y}

func scene_overlay_snapshot() -> Dictionary:
	var captions: Array[Dictionary] = []
	for caption in visible_scene_captions:
		var item := rect_snapshot(caption.rect)
		item["id"] = caption.id
		item["text"] = caption.text
		item["eatery_index"] = caption.eatery_index
		captions.append(item)
	var speech := rect_snapshot(speech_bubble_screen_rect())
	speech["visible"] = is_speech_bubble_visible()
	speech["deferred"] = speech_bubble_deferred
	speech["in_info"] = speech_bubble_in_info
	speech["in_activity"] = speech_bubble_in_activity
	speech["anchor"] = speech_bubble_anchor
	speech["text"] = speech_bubble_text
	speech["remaining"] = speech_bubble_timer
	var talk := rect_snapshot(talk_prompt_screen_rect())
	talk["visible"] = talk_prompt_node != null and talk_prompt_node.is_visible_in_tree()
	var counter: Dictionary = {}
	if eatery_guide_idx >= 0 and eatery_guide_idx < eatery_counter_points.size():
		var cp := eatery_counter_points[eatery_guide_idx]
		var screen := camera.unproject_position(Vector3(cp.x, 1.3, cp.y))
		counter = {"x": screen.x, "y": screen.y, "index": eatery_guide_idx, "orders": int(eatery_order_counts.get(String(NEIGHBORHOOD_EATERIES[eatery_guide_idx].id), 0))}
	var reward_title := control_snapshot(reward_title_label)
	reward_title["text"] = reward_title_label.text
	reward_title["lines"] = reward_title_label.get_line_count()
	reward_title["visible_lines"] = reward_title_label.get_visible_line_count()
	var reward := control_snapshot(reward_banner)
	reward["remaining"] = reward_banner_timer
	return {"player": rect_snapshot(player_overlay_rect()), "speech": speech, "reward": reward, "reward_title": reward_title, "guide_label": control_snapshot(guide_arrow_label), "talk": talk, "captions": captions, "counter": counter}

func get_a11y_status_snapshot() -> Dictionary:
	var active_panel := "none"
	if block_panel != null and block_panel.visible:
		active_panel = "block"
	elif mural_panel != null and mural_panel.visible:
		active_panel = "mural"
	elif music_panel != null and music_panel.visible:
		active_panel = "music"
	var tour := landmark_tour_state()
	var obj := current_objective()
	var action_controls: Array[Dictionary] = []
	if block_panel != null and block_panel.visible and block_panel_mode == "talk":
		for i in range(conv_action_btns.size()):
			var btn: Button = conv_action_btns[i]
			if btn.is_visible_in_tree():
				var rect := btn.get_global_rect()
				action_controls.append({"id": conv_action_ids[i], "label": btn.text, "x": rect.position.x, "y": rect.position.y, "width": rect.size.x, "height": rect.size.y})
		if conv_next_btn != null and conv_next_btn.is_visible_in_tree():
			var rect := conv_next_btn.get_global_rect()
			action_controls.append({"id": "whats_next", "label": conv_next_btn.text, "x": rect.position.x, "y": rect.position.y, "width": rect.size.x, "height": rect.size.y})
	var vp := bubble_viewport_size()
	var contact := player_visual.get_node_or_null("ContactShadow") as MeshInstance3D
	var nearest_pool_distance := INF
	var nearest_pool_center := Vector2.ZERO
	for pool in light_pool_centers:
		var distance := player_xz().distance_to(pool)
		if distance < nearest_pool_distance:
			nearest_pool_distance = distance
			nearest_pool_center = pool
	var marker_screen := Vector2.ZERO
	var marker_visible := false
	if guide_marker != null and camera != null:
		var center := guide_marker.global_position + Vector3.UP * 0.5 * guide_marker.scale.y
		marker_screen = camera.unproject_position(center)
		marker_visible = guide_marker.visible and not camera.is_position_behind(center) and play_area_rect().has_point(marker_screen) and not is_screen_point_in_ui(marker_screen)
	return {
		"ui_frame": Engine.get_process_frames(),
		"sounds_control": control_snapshot(sounds_btn),
		"music_toggle_control": control_snapshot(music_toggle_btn),
		"music_toggle_text": music_toggle_btn.text if music_toggle_btn != null else "",
		"start_control": control_snapshot(story_continue_btn),
		"story_detail": activity_detail_snapshot(story_body_label, story_card, [story_continue_btn]),
		"story_reading_focus": story_reader_has_focus(),
		"story_start_focus": story_continue_btn != null and story_continue_btn.has_focus(),
		"startup_pending": startup_story_pending,
		"layout_refit_pending": layout_refit_pending,
		"info_control": control_snapshot(header_panel.find_child("HeaderInfoToggle", true, false) as Control),
		"header_control": control_snapshot(header_panel),
		"walk_control": control_snapshot(walk_control),
		"walk_control_text": walk_control.text if walk_control != null else "",
		"header_details_expanded": header_details_expanded,
		"progress_text": progress_label.text if progress_label != null else "",
		"conversation_header": block_label.text if block_label != null else "",
		"block_panel_control": control_snapshot(block_panel),
		"controls_control": control_snapshot(controls),
		"block_hub_page": block_hub_page if uses_paged_block_actions() else 0,
		"block_hub_pages": block_action_page_count() if uses_paged_block_actions() else 1,
		"block_hub_paged": uses_paged_block_actions(),
		"block_hub_side": uses_side_block_hub(),
		"side_panel_dock": has_side_panel_dock(),
		"compact_narrow_activity": uses_compact_narrow_activities(),
		"compact_panel_layout_pending": compact_panel_layout_pending,
		"conversation_detail": activity_detail_snapshot(block_detail_label, block_panel, conv_buttons),
		"panel_subject_screen": rect_snapshot(Rect2(camera.unproject_position(panel_frame_subject), Vector2.ZERO)) if panel_frame_control != null and panel_frame_control.visible else {},
		"panel_subject_points": panel_subject_snapshots(),
		"walking_controls": walking_control_snapshots(),
		"info_reader": activity_detail_snapshot(info, header_panel, []),
		"block_page_previous": control_snapshot(block_page_prev),
		"block_page_next": control_snapshot(block_page_next),
		"block_close_control": control_snapshot(block_close_btn),
		"block_detail_control": control_snapshot(block_detail_label),
		"block_detail_text": block_detail_label.text if block_detail_label != null else "",
		"block_detail_scroll_max": block_detail_label.get_v_scroll_bar().max_value if block_detail_label != null else 0.0,
		"block_detail_scroll_value": block_detail_label.get_v_scroll_bar().value if block_detail_label != null else 0.0,
		"block_detail_scroll_page": block_detail_label.get_v_scroll_bar().page if block_detail_label != null else 0.0,
		"block_hub_actions": block_action_snapshots(),
		"mural_detail": activity_detail_snapshot(mural_detail_label, mural_panel, mural_buttons),
		"music_detail": activity_detail_snapshot(music_stem_label, music_panel, music_buttons),
		"reward_sounds_enabled": reward_sounds_enabled,
		"reward_audio_unlocked": reward_audio_unlocked,
		"reward_sound_count": reward_sound_count,
		"reward_sound_last_cue": reward_sound_last_cue,
		"reward_audio_playing": reward_audio_player != null and reward_audio_player.playing,
		"camera_view_size": view_size,
		"camera_pose": {"target_x": target.x, "target_y": target.y, "target_z": target.z, "yaw": camera_yaw, "pitch": camera_pitch_scale},
		"following_player": following_player,
		"in_overview": in_overview,
		"in_wide_overview": in_wide_overview,
		"cutaway_additions": occluded_additions.size(),
		"player_screen": {"x": camera.unproject_position(player.position + Vector3.UP).x, "y": camera.unproject_position(player.position + Vector3.UP).y},
		"player_grounding": {"x": player.position.x, "z": player.position.z, "shadow_x": contact.global_position.x if contact != null else null, "shadow_z": contact.global_position.z if contact != null else null, "shadow_y": contact.global_position.y if contact != null else null, "stride": player_stride_blend, "path_active": not current_path.is_empty(), "nearest_light_pool_distance": nearest_pool_distance, "nearest_light_pool_x": nearest_pool_center.x, "nearest_light_pool_z": nearest_pool_center.y},
		"evening_mode": evening_mode,
		"play_area": {"x": play_area_rect().position.x, "y": play_area_rect().position.y, "width": play_area_rect().size.x, "height": play_area_rect().size.y},
		"overlays": scene_overlay_snapshot(),
		"guide_marker_screen": {"x": marker_screen.x, "y": marker_screen.y, "visible": marker_visible},
		"seq": a11y_announcement_seq,
		"announcement": last_a11y_announcement,
		"active_panel": active_panel,
		"visited_count": visited_neighbors.size(),
		"mural_count": mural_placements.size(),
		"mural_palette": mural_palette,
		"soundcheck_done": rook_soundcheck_done,
		"block_ready": is_block_ready(),
		"block_opened": block_opened,
		"history_read": history_read,
		"blackhawk_discovered": blackhawk_discovered,
		"district_boundary_visible": district_boundary_visible,
		"keepsake_status": String(keepsake_photo.get("status", "unasked")),
		"keepsake_participants": keepsake_photo.get("participants", []).duplicate(),
		"keepsake_exported": not last_exported_keepsake_svg.is_empty(),
		"epilogue_packing": epilogue_packing,
		"loans_returned_count": epilogue_returned.size(),
		"epilogue_done": is_epilogue_done(),
		"programme_published": programme_published.duplicate(),
		"hosting_order": hosting_order.duplicate(),
		"hosting_completed_count": hosting_results.size(),
		"hosting_current": current_hosting_activity(),
		"hosting_done": is_hosting_done(),
		"civic_phase": civic_phase,
		"civic_done": civic_phase == "done",
		"film_phase": film_phase,
		"film_captured_count": film_captured.size(),
		"film_screen_frame": film_screen_frame,
		"film_done": film_phase == "done",
		"voices_enabled": voices_enabled,
		"voices_status": voices_status,
		"voices_count": voices_records.size(),
		"voices_generation": voices_generation,
		"last_voices_teardown_usec": last_voices_teardown_usec,
		"total_buildings": all_buildings.size(),
		"wider_buildings_count": wider_meshes.size(),
		"surprises_found": discovered_surprises.size(),
		"keepsakes_visible": visible_surprise_keepsake_count(),
		"objective_tour_id": String(obj.get("tour_id", "")),
		"objective_text": String(obj.get("text", "")),
		"tour_count": int(tour.count),
		"tour_total": int(tour.total),
		"tour_celebrated": landmark_tour_celebrated,
		"museum_eras_count": visited_museum_eras.size(),
		"park_visited": boeddeker_park_visited,
		"so_what_visited": so_what_visited,
		"conversation_actions": action_controls,
		"viewport_width": vp.x,
		"viewport_height": vp.y,
		"sparks": spark_count(),
		"reward_burst_count": reward_burst_count,
		"last_reward_title": last_reward_title,
		"music_playing": music_playing,
		"music_audio_playing": (sketch_player != null and sketch_player.playing) or (local_audio_player != null and local_audio_player.playing),
		"music_buffer_ready": sketch_playback != null,
		"music_sample_rms": last_sample_rms,
		"music_volume": music_volume,
		"music_mode": music_mode,
		"browser_import_status": browser_import_status
	}

func announce_a11y_status(msg: String) -> void:
	var clean := msg.replace("\n", " ").strip_edges()
	if clean.is_empty():
		return
	a11y_announcement_seq += 1
	last_a11y_announcement = clean
	sync_web_a11y_status()

func sync_web_a11y_status() -> void:
	if not OS.has_feature("web"):
		return
	a11y_sync_pending = true

## Publish one complete frame after speech and captions have been composed.
func flush_web_a11y_status() -> void:
	if not a11y_sync_pending:
		return
	a11y_sync_pending = false
	var payload := JSON.stringify(get_a11y_status_snapshot())
	if payload == last_synced_a11y_json:
		return
	last_synced_a11y_json = payload
	var js_lit := JSON.stringify(payload)
	JavaScriptBridge.eval("window.__tenderloinUpdateA11yDOM && window.__tenderloinUpdateA11yDOM(%s);" % js_lit, true)

func prompt_local_music_file() -> void:
	show_music_panel(true)
	if OS.has_feature("web"):
		JavaScriptBridge.eval("window.__tenderloinOpenAudioPicker && window.__tenderloinOpenAudioPicker();", true)
	else:
		info.text = "Choose a local MP3, WAV, or OGG track (or call load_local_music_bytes)\nTab-local only — never uploaded or saved · Sketch remains available\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL"

func poll_web_audio() -> void:
	if not OS.has_feature("web"):
		return
	var perf_req: Variant = JavaScriptBridge.eval("var pr = Boolean(window.__tenderloinWebPerfRequestPending); window.__tenderloinWebPerfRequestPending = false; pr;", true)
	if bool(perf_req):
		var perf_json := JSON.stringify(measure_local_performance())
		JavaScriptBridge.eval("window.__tenderloinLastPerfSnapshot = JSON.parse(%s);" % JSON.stringify(perf_json), true)
	var voices_lc_var: Variant = JavaScriptBridge.eval("var vlc = window.__tenderloinWebVoicesLifecyclePending || ''; window.__tenderloinWebVoicesLifecyclePending = ''; String(vlc);", true)
	var voices_lc := String(voices_lc_var) if voices_lc_var is String else ""
	if voices_lc == "suspend":
		suspend_voices()
	elif voices_lc == "resume":
		resume_voices()
	var has_save_pending: Variant = JavaScriptBridge.eval("Boolean(window.__tenderloinWebSavePending);", true)
	if bool(has_save_pending):
		var save_err_var: Variant = JavaScriptBridge.eval("window.__tenderloinWebSavePending ? String(window.__tenderloinWebSavePending.err || '') : '';", true)
		var save_raw_var: Variant = JavaScriptBridge.eval("var sp = window.__tenderloinWebSavePending; window.__tenderloinWebSavePending = null; (sp && !sp.err) ? String(sp.raw || '') : '';", true)
		var save_err := String(save_err_var) if save_err_var is String else ""
		var save_raw := String(save_raw_var) if save_raw_var is String else ""
		if not save_err.is_empty():
			browser_import_status = "error"
			browser_import_message = "Browser save file exceeds 64 KB limit; Godot progress kept." if save_err == "size" else "Browser save file could not be read; Godot progress kept."
			update_block_ui()
			info.text = "%s\nBrowser save ('%s') is read-only and never overwritten by Godot\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [browser_import_message, BROWSER_WEB_STORAGE_KEY]
			announce_a11y_status(browser_import_message)
		else:
			import_browser_save_json(save_raw)
	var has_pending: Variant = JavaScriptBridge.eval("Boolean(window.__tenderloinWebAudioPending);", true)
	if not bool(has_pending):
		return
	var fname_var: Variant = JavaScriptBridge.eval("window.__tenderloinWebAudioPending ? String(window.__tenderloinWebAudioPending.name || '') : '';", true)
	var err_var: Variant = JavaScriptBridge.eval("window.__tenderloinWebAudioPending ? String(window.__tenderloinWebAudioPending.err || '') : '';", true)
	var raw_var: Variant = JavaScriptBridge.eval("var p = window.__tenderloinWebAudioPending; window.__tenderloinWebAudioPending = null; (p && p.bytes instanceof Uint8Array) ? p.bytes : new Uint8Array(0);", true)
	var fname := String(fname_var) if fname_var is String else ""
	var err := String(err_var) if err_var is String else ""
	var raw: PackedByteArray = raw_var if raw_var is PackedByteArray else PackedByteArray()
	if not err.is_empty() or raw.is_empty():
		music_error = MUSIC_FILE_ERROR
		update_music_ui()
		announce_a11y_status(MUSIC_FILE_ERROR)
		return
	load_local_music_bytes(fname, raw)

func can_interact_with_mural() -> bool:
	return arrived_mural or arrived_neighbor == celeste_index or (mural_panel != null and mural_panel.visible)

func is_valid_mural_cell(col: int, row: int) -> bool:
	return col >= 0 and col < MURAL_BOARD_COLS and row >= 0 and row < MURAL_BOARD_ROWS

func cell_occupied_by_other(col: int, row: int, ignore_motif: String) -> bool:
	for m_id in mural_placements.keys():
		if String(m_id) == ignore_motif:
			continue
		var c_dict: Dictionary = mural_placements[m_id]
		if int(c_dict.get("col", -1)) == col and int(c_dict.get("row", -1)) == row:
			return true
	return false

func first_free_mural_cell(preferred: Vector2i, ignore_motif: String) -> Vector2i:
	if is_valid_mural_cell(preferred.x, preferred.y) and not cell_occupied_by_other(preferred.x, preferred.y, ignore_motif):
		return preferred
	var start_idx := clampi(preferred.y * MURAL_BOARD_COLS + preferred.x, 0, MURAL_BOARD_COLS * MURAL_BOARD_ROWS - 1)
	var total := MURAL_BOARD_COLS * MURAL_BOARD_ROWS
	for offset in range(total):
		var idx := posmod(start_idx + offset, total)
		var c := idx % MURAL_BOARD_COLS
		var r := int(idx / MURAL_BOARD_COLS)
		if not cell_occupied_by_other(c, r, ignore_motif):
			return Vector2i(c, r)
	return Vector2i(0, 0)

func place_mural_motif(motif_id: String, col: int, row: int) -> bool:
	if not motif_id in MURAL_MOTIFS:
		return false
	if not is_valid_mural_cell(col, row):
		return false
	if cell_occupied_by_other(col, row, motif_id):
		return false
	browser_import_message = ""
	var was_completed := mural_completed
	active_motif = motif_id
	mural_placements[motif_id] = {"col": col, "row": row}
	update_mural_3d()
	save_godot_state()
	update_mural_ui()
	update_block_ui()
	if mural_completed and not was_completed:
		trigger_progress_cue("mural_complete", "3/3 motifs")
	else:
		trigger_progress_cue("mural_motif", motif_id)
	info.text = "Placed %s motif at (%d, %d) on Portable Mural Board with Celeste (%d/3 motifs)\nFreestanding sidewalk easel · %s palette · Saved to Godot storage\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [motif_id.capitalize(), col, row, mural_placements.size(), mural_palette.capitalize()]
	announce_a11y_status("Placed %s motif at (%d, %d) on Portable Mural Board (%d/3 motifs)." % [motif_id.capitalize(), col, row, mural_placements.size()])
	return true

func activate_or_advance_motif(motif_id: String) -> bool:
	if not motif_id in MURAL_MOTIFS:
		return false
	show_mural_panel(true)
	active_motif = motif_id
	if not mural_placements.has(motif_id):
		var pref: Vector2i = MURAL_DEFAULT_CELLS.get(motif_id, Vector2i(0, 0))
		var target_cell := first_free_mural_cell(pref, motif_id)
		return place_mural_motif(motif_id, target_cell.x, target_cell.y)
	return move_active_motif(1, 0)

func move_active_motif(dcol: int, drow: int) -> bool:
	if not active_motif in MURAL_MOTIFS:
		active_motif = "sun"
	show_mural_panel(true)
	if not mural_placements.has(active_motif):
		var pref: Vector2i = MURAL_DEFAULT_CELLS.get(active_motif, Vector2i(0, 0))
		var target_cell := first_free_mural_cell(pref, active_motif)
		return place_mural_motif(active_motif, target_cell.x, target_cell.y)
	var cur_cell: Dictionary = mural_placements[active_motif]
	var cur_c: int = int(cur_cell.get("col", 0))
	var cur_r: int = int(cur_cell.get("row", 0))
	var direct_c := cur_c + dcol
	var direct_r := cur_r + drow
	if is_valid_mural_cell(direct_c, direct_r) and not cell_occupied_by_other(direct_c, direct_r, active_motif):
		return place_mural_motif(active_motif, direct_c, direct_r)
	var step_delta := drow * MURAL_BOARD_COLS + dcol
	if step_delta == 0:
		step_delta = 1
	var total := MURAL_BOARD_COLS * MURAL_BOARD_ROWS
	var cur_idx := cur_r * MURAL_BOARD_COLS + cur_c
	var dir_sign := 1 if step_delta > 0 else -1
	for step in range(1, total):
		var cand_idx := posmod(cur_idx + step * dir_sign, total)
		var cand_c := cand_idx % MURAL_BOARD_COLS
		var cand_r := int(cand_idx / MURAL_BOARD_COLS)
		if not cell_occupied_by_other(cand_c, cand_r, active_motif):
			return place_mural_motif(active_motif, cand_c, cand_r)
	return false

func set_mural_palette(palette_id: String) -> bool:
	if not palette_id in MURAL_PALETTES:
		return false
	mural_palette = palette_id
	update_mural_3d()
	save_godot_state()
	update_mural_ui()
	trigger_progress_cue("mural_palette", palette_id)
	info.text = "Portable Mural Board palette set to %s with Celeste (%d/3 motifs)\nFreestanding sidewalk easel · Saved to Godot storage\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [mural_palette.capitalize(), mural_placements.size()]
	announce_a11y_status("Portable Mural Board palette set to %s (%d/3 motifs)." % [mural_palette.capitalize(), mural_placements.size()])
	return true

func cycle_mural_palette() -> String:
	show_mural_panel(true)
	var idx := MURAL_PALETTES.find(mural_palette)
	var next_id: String = MURAL_PALETTES[posmod(idx + 1, MURAL_PALETTES.size())]
	set_mural_palette(next_id)
	return mural_palette

func clear_mural_board() -> void:
	browser_import_message = ""
	if block_opened:
		info.text = "Block gathering is open — Portable Mural Board stays on display with Celeste (3/3 motifs · %s palette)\nAdjust motif positions or cycle palette freely\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % mural_palette.capitalize()
		announce_a11y_status("Block gathering is open; Portable Mural Board stays on display.")
		return
	mural_placements.clear()
	mural_completed = false
	update_mural_3d()
	save_godot_state()
	update_mural_ui()
	update_block_ui()
	info.text = "Cleared Portable Mural Board with Celeste (0/3 motifs · %s palette)\nPlace Sun, Wave, and Rise on the 6×3 freestanding board\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % mural_palette.capitalize()
	announce_a11y_status("Cleared Portable Mural Board (0/3 motifs).")

func resolve_save_path() -> String:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--godot-save-path="):
			var custom := arg.trim_prefix("--godot-save-path=").strip_edges()
			if not custom.is_empty():
				return custom
		if arg == "--test-suite":
			return GODOT_TEST_SAVE_PATH
	for arg in OS.get_cmdline_args():
		if arg.ends_with("study_test.gd") or arg == "--test-suite":
			return GODOT_TEST_SAVE_PATH
	return GODOT_SAVE_PATH

func is_whole_json_number(val: Variant) -> bool:
	if val is int:
		return true
	if val is float:
		return not is_nan(val) and not is_inf(val) and is_equal_approx(val, roundf(val))
	return false

func valid_neighbor_ids() -> Array[String]:
	var ids: Array[String] = []
	for n in neighbors:
		var nid := String(n.get("id", ""))
		if not nid.is_empty():
			ids.append(nid)
	return ids

func build_save_envelope() -> Dictionary:
	var v_list: Array[String] = []
	for k in visited_neighbors.keys():
		v_list.append(String(k))
	v_list.sort()
	var s_list: Array[String] = []
	for sk in discovered_surprises.keys():
		var s_id := String(sk)
		if s_id in NEIGHBORHOOD_SURPRISE_IDS:
			s_list.append(s_id)
	s_list.sort()
	return {
		"schema": "tenderloin-redux.godot.save",
		"version": GODOT_SAVE_VERSION,
		"save_seq": save_seq,
		"celeste_talk_count": celeste_talk_count,
		"mural_palette": mural_palette,
		"active_motif": active_motif,
		"mural_placements": mural_placements.duplicate(true),
		"rook_soundcheck_done": rook_soundcheck_done,
		"visited_neighbors": v_list,
		"discovered_surprises": s_list,
		"block_opened": block_opened,
		"gathering_layout": gathering_layout,
		"history_read": history_read,
		"blackhawk_discovered": blackhawk_discovered,
		"district_boundary_visible": district_boundary_visible,
		"epilogue": {
			"photo": keepsake_photo.duplicate(true),
			"packing": epilogue_packing,
			"returned": epilogue_returned.duplicate()
		},
		"programme": {
			"order": programme_order.duplicate(),
			"published": programme_published.duplicate()
		},
		"hosting": {
			"order": hosting_order.duplicate(),
			"results": hosting_results.duplicate(true),
			"draft": hosting_draft.duplicate(true)
		},
		"civic": {
			"phase": civic_phase,
			"draft": copy_civic_plan(civic_draft),
			"result": copy_civic_plan(civic_result) if is_valid_civic_plan(civic_result) else null
		},
		"film": {
			"phase": film_phase,
			"draft": copy_film_plan(film_draft),
			"result": copy_film_plan(film_result) if is_valid_film_plan(film_result) else null,
			"captured": film_captured.duplicate()
		},
		"optional": optional_save_data.duplicate(true)
	}

func save_godot_state() -> bool:
	save_seq += 1
	var raw_json := JSON.stringify(build_save_envelope())
	var wrote := false
	if OS.has_feature("web"):
		var js_literal := JSON.stringify(raw_json)
		var web_ok: Variant = JavaScriptBridge.eval("try { window.localStorage.setItem('%s', %s); true; } catch (_e) { false; }" % [GODOT_WEB_STORAGE_KEY, js_literal], true)
		wrote = wrote or bool(web_ok)
	if not wrote:
		var file := FileAccess.open(save_path, FileAccess.WRITE)
		if file != null:
			file.store_string(raw_json)
			file.close()
			wrote = true
	return wrote

func reset_mural_state_to_defaults(status_label: String) -> void:
	if reward_audio_player != null:
		reward_audio_player.stop()
	celeste_talk_count = 0
	rook_talk_count = 0
	neighbor_talk_counts.clear()
	last_panel_dialogue = ""
	mural_palette = "garden"
	active_motif = "sun"
	mural_placements.clear()
	mural_completed = false
	rook_soundcheck_done = false
	visited_neighbors.clear()
	discovered_surprises.clear()
	surprise_guide_idx = -1
	last_hinted_surprise_id = ""
	museum_hub_step = 0
	active_time_era = "present"
	visited_museum_eras.clear()
	landmark_tour_celebrated = false
	boeddeker_park_visited = false
	so_what_visited = false
	eatery_guide_idx = -1
	eatery_order_counts.clear()
	for counter in eatery_counter_nodes:
		counter.visible = false
	last_reward_title = ""
	hide_speech_bubble()
	reward_banner_timer = 0.0
	if reward_banner != null:
		reward_banner.visible = false
	celebration_burst_timer = 0.0
	if celebration_burst_node != null:
		celebration_burst_node.visible = false
	block_opened = false
	gathering_layout = ""
	keepsake_photo = default_keepsake_photo()
	last_exported_keepsake_svg = ""
	epilogue_packing = false
	epilogue_returned.clear()
	programme_order.clear()
	programme_published.clear()
	hosting_order.clear()
	hosting_results.clear()
	hosting_draft = default_hosting_draft()
	civic_phase = "idle"
	civic_draft = default_civic_draft()
	civic_result = {}
	film_phase = "idle"
	film_draft = default_film_draft()
	film_result = {}
	film_captured.clear()
	film_screen_frame = 0
	optional_save_data = {}
	history_read = false
	blackhawk_discovered = false
	district_boundary_visible = true
	walking_to_history_stop = ""
	arrived_history_stop = ""
	in_wide_overview = false
	browser_import_status = "none"
	browser_import_message = ""
	stop_music_playback()
	sketch_tick = 0
	sketch_phase = 0.0
	sketch_frames_pushed = 0
	music_mode = "sketch"
	local_music_name = ""
	music_error = ""
	if local_audio_player != null:
		local_audio_player.stream = null
	save_load_status = status_label
	update_mural_3d()
	update_speaker_3d()
	update_block_3d()
	update_district_boundary_3d()
	update_history_stops_3d()
	update_neighborhood_surprises_3d()
	update_museum_portal_3d()
	update_mural_ui()
	update_music_ui()
	update_block_ui()
	sync_web_a11y_status()

func validate_mural_dict(raw_val: Variant, require_full: bool) -> Dictionary:
	if not (raw_val is Dictionary):
		return {"ok": false, "placements": {}}
	var raw_dict: Dictionary = raw_val
	var clean_placements: Dictionary = {}
	var occupied: Dictionary = {}
	for k in raw_dict.keys():
		var motif_key := String(k)
		if not (motif_key in MURAL_MOTIFS):
			return {"ok": false, "placements": {}}
		var cell_val: Variant = raw_dict[k]
		if not (cell_val is Dictionary):
			return {"ok": false, "placements": {}}
		var cell_dict: Dictionary = cell_val
		var c_val: Variant = cell_dict.get("col", null)
		var r_val: Variant = cell_dict.get("row", null)
		if not is_whole_json_number(c_val) or not is_whole_json_number(r_val):
			return {"ok": false, "placements": {}}
		var c_int := int(roundf(float(c_val)))
		var r_int := int(roundf(float(r_val)))
		if not is_valid_mural_cell(c_int, r_int):
			return {"ok": false, "placements": {}}
		var cell_key := "%d,%d" % [c_int, r_int]
		if occupied.has(cell_key):
			return {"ok": false, "placements": {}}
		occupied[cell_key] = true
		clean_placements[motif_key] = {"col": c_int, "row": r_int}
	if require_full and clean_placements.size() != MURAL_MOTIFS.size():
		return {"ok": false, "placements": {}}
	return {"ok": true, "placements": clean_placements}

func validate_godot_epilogue(raw_ep: Variant, allow_opened: bool, fallback_palette: String) -> Dictionary:
	if not (raw_ep is Dictionary):
		return {"ok": false}
	var ep: Dictionary = raw_ep
	var packing := false
	if ep.has("packing"):
		var pk_val: Variant = ep.get("packing")
		if not (pk_val is bool):
			return {"ok": false}
		packing = bool(pk_val)
	var clean_ret: Array[String] = []
	if ep.has("returned"):
		var ret_val: Variant = ep.get("returned")
		if not (ret_val is Array):
			return {"ok": false}
		var seen_ret: Dictionary = {}
		for item in ret_val:
			if not (item is String):
				return {"ok": false}
			var lid := String(item)
			if not (lid in LOAN_IDS) or seen_ret.has(lid):
				return {"ok": false}
			seen_ret[lid] = true
		if not packing and not seen_ret.is_empty():
			return {"ok": false}
		for lid in LOAN_IDS:
			if seen_ret.has(lid):
				clean_ret.append(lid)
	if packing and not ep.has("photo"):
		return {"ok": false}
	var clean_photo := default_keepsake_photo()
	clean_photo["palette"] = fallback_palette
	if ep.has("photo"):
		var ph_val: Variant = ep.get("photo")
		if not (ph_val is Dictionary):
			return {"ok": false}
		var ph: Dictionary = ph_val
		var st_val: Variant = ph.get("status", "unasked")
		if not (st_val is String) or not (String(st_val) in ["unasked", "taken", "skipped"]):
			return {"ok": false}
		var st := String(st_val)
		if packing and st == "unasked":
			return {"ok": false}
		var lay_id := "table"
		if ph.has("layout"):
			var lay_val: Variant = ph.get("layout")
			if not (lay_val is String) or not (String(lay_val) in ["table", "floor"]):
				return {"ok": false}
			lay_id = String(lay_val)
		if st == "taken":
			var p_val: Variant = ph.get("participants", null)
			if not (p_val is Array) or p_val.is_empty():
				return {"ok": false}
			var seen_p: Dictionary = {}
			for item in p_val:
				if not (item is String):
					return {"ok": false}
				var gid := String(item)
				if not (gid in PHOTO_GUESTS) or seen_p.has(gid):
					return {"ok": false}
				seen_p[gid] = true
			var canon_p: Array[String] = []
			for gid in PHOTO_GUESTS:
				if seen_p.has(gid):
					canon_p.append(gid)
			var k_pal_val: Variant = ph.get("palette", "")
			if not (k_pal_val is String) or not (String(k_pal_val) in MURAL_PALETTES):
				return {"ok": false}
			var m_res := validate_mural_dict(ph.get("mural", null), true)
			if not bool(m_res.get("ok", false)):
				return {"ok": false}
			clean_photo = {
				"status": "taken",
				"participants": canon_p,
				"mural": m_res.get("placements", {}),
				"palette": String(k_pal_val),
				"layout": lay_id
			}
		else:
			if ph.has("participants"):
				var non_taken_p: Variant = ph.get("participants")
				if not (non_taken_p is Array) or not (non_taken_p as Array).is_empty():
					return {"ok": false}
			clean_photo = {
				"status": st,
				"participants": [],
				"mural": {},
				"palette": fallback_palette,
				"layout": lay_id
			}
	if not allow_opened:
		return {"ok": true, "photo": default_keepsake_photo(), "packing": false, "returned": [] as Array[String]}
	return {"ok": true, "photo": clean_photo, "packing": packing, "returned": clean_ret}

func validate_godot_programme(raw_prog: Variant, allow_opened: bool) -> Dictionary:
	if not (raw_prog is Dictionary):
		return {"ok": false}
	var prog: Dictionary = raw_prog
	var clean_order: Array[String] = []
	if prog.has("order"):
		var ord_val: Variant = prog.get("order")
		if not (ord_val is Array) or ord_val.size() > PROGRAMME_SEGMENTS.size():
			return {"ok": false}
		for item in ord_val:
			if not (item is String):
				return {"ok": false}
			var sid := String(item)
			if not (sid in PROGRAMME_SEGMENTS) or clean_order.has(sid):
				return {"ok": false}
			clean_order.append(sid)
	var clean_pub: Array[String] = []
	if prog.has("published"):
		var pub_val: Variant = prog.get("published")
		if not (pub_val is Array):
			return {"ok": false}
		if not pub_val.is_empty():
			if pub_val.size() != PROGRAMME_SEGMENTS.size() or programme_issue(pub_val) != "":
				return {"ok": false}
			for item in pub_val:
				clean_pub.append(String(item))
	if not allow_opened:
		return {"ok": true, "order": [] as Array[String], "published": [] as Array[String]}
	return {"ok": true, "order": clean_order, "published": clean_pub}

func validate_godot_hosting(raw_host: Variant, allow_opened: bool) -> Dictionary:
	if not (raw_host is Dictionary):
		return {"ok": false}
	var host: Dictionary = raw_host
	var clean_order: Array[String] = []
	if host.has("order"):
		var ord_val: Variant = host.get("order")
		if not (ord_val is Array):
			return {"ok": false}
		if not ord_val.is_empty():
			if ord_val.size() != PROGRAMME_SEGMENTS.size() or programme_issue(ord_val) != "":
				return {"ok": false}
			for item in ord_val:
				clean_order.append(String(item))
	var clean_results: Array[Dictionary] = []
	if host.has("results"):
		var res_val: Variant = host.get("results")
		if not (res_val is Array) or res_val.size() > PROGRAMME_SEGMENTS.size():
			return {"ok": false}
		if clean_order.is_empty() and not res_val.is_empty():
			return {"ok": false}
		for i in range(res_val.size()):
			var entry_val: Variant = res_val[i]
			if not (entry_val is Dictionary):
				return {"ok": false}
			var entry: Dictionary = entry_val
			var expected_id := clean_order[i]
			if String(entry.get("id", "")) != expected_id:
				return {"ok": false}
			var v: Variant = entry.get("value", null)
			if expected_id == "stories":
				if not (v is String) or not (String(v) in HOSTING_STORIES):
					return {"ok": false}
				clean_results.append({"id": "stories", "value": String(v)})
			elif expected_id == "beats":
				if not is_whole_json_number(v):
					return {"ok": false}
				var pat_i := int(roundf(float(v)))
				if pat_i < 0 or pat_i > 255:
					return {"ok": false}
				clean_results.append({"id": "beats", "value": pat_i})
			elif expected_id == "art":
				if not (v is Dictionary):
					return {"ok": false}
				var art_d: Dictionary = v
				var a_pal: Variant = art_d.get("palette", "")
				var a_tiles: Variant = art_d.get("tiles", null)
				if not (a_pal is String) or not (String(a_pal) in HOSTING_PALETTES) or not (a_tiles is Array) or a_tiles.size() != 6:
					return {"ok": false}
				var clean_t: Array[int] = []
				for tv in a_tiles:
					if not is_whole_json_number(tv):
						return {"ok": false}
					var ti := int(roundf(float(tv)))
					if ti < 0 or ti > 2:
						return {"ok": false}
					clean_t.append(ti)
				clean_results.append({"id": "art", "value": {"palette": String(a_pal), "tiles": clean_t}})
			elif expected_id == "pause":
				if not (v is String) or not (String(v) in HOSTING_QUIETS):
					return {"ok": false}
				clean_results.append({"id": "pause", "value": String(v)})
	var clean_draft := default_hosting_draft()
	if host.has("draft"):
		var dr_val: Variant = host.get("draft")
		if not (dr_val is Dictionary):
			return {"ok": false}
		var dr: Dictionary = dr_val
		if dr.has("story"):
			if not (dr.get("story") is String) or not (String(dr.get("story")) in HOSTING_STORIES):
				return {"ok": false}
			clean_draft["story"] = String(dr.get("story"))
		if dr.has("pattern"):
			var p_v: Variant = dr.get("pattern")
			if not is_whole_json_number(p_v):
				return {"ok": false}
			var p_i := int(roundf(float(p_v)))
			if p_i < 0 or p_i > 255:
				return {"ok": false}
			clean_draft["pattern"] = p_i
		if dr.has("palette"):
			if not (dr.get("palette") is String) or not (String(dr.get("palette")) in HOSTING_PALETTES):
				return {"ok": false}
			clean_draft["palette"] = String(dr.get("palette"))
		if dr.has("quiet"):
			if not (dr.get("quiet") is String) or not (String(dr.get("quiet")) in HOSTING_QUIETS):
				return {"ok": false}
			clean_draft["quiet"] = String(dr.get("quiet"))
		if dr.has("tiles"):
			var dt_val: Variant = dr.get("tiles")
			if not (dt_val is Array) or dt_val.size() != 6:
				return {"ok": false}
			var dt_clean: Array[int] = []
			for tv in dt_val:
				if not is_whole_json_number(tv):
					return {"ok": false}
				var ti := int(roundf(float(tv)))
				if ti < 0 or ti > 2:
					return {"ok": false}
				dt_clean.append(ti)
			clean_draft["tiles"] = dt_clean
	if not allow_opened:
		return {"ok": true, "order": [] as Array[String], "results": [] as Array[Dictionary], "draft": default_hosting_draft()}
	return {"ok": true, "order": clean_order, "results": clean_results, "draft": clean_draft}

func validate_godot_civic(raw_civic: Variant, allow_civic: bool) -> Dictionary:
	if not (raw_civic is Dictionary):
		return {"ok": false}
	var cv: Dictionary = raw_civic
	var ph_val: Variant = cv.get("phase", "idle")
	if not (ph_val is String) or not (String(ph_val) in ["idle", "planning", "meeting", "done"]):
		return {"ok": false}
	var ph := String(ph_val)
	var clean_draft := default_civic_draft()
	if cv.has("draft"):
		var dr_val: Variant = cv.get("draft")
		if not (dr_val is Dictionary):
			return {"ok": false}
		var dr: Dictionary = dr_val
		if dr.has("topic"):
			if not (dr.get("topic") is String) or not (String(dr.get("topic")) in CIVIC_TOPICS):
				return {"ok": false}
			clean_draft["topic"] = String(dr.get("topic"))
		if dr.has("format"):
			if not (dr.get("format") is String) or not (String(dr.get("format")) in CIVIC_FORMATS):
				return {"ok": false}
			clean_draft["format"] = String(dr.get("format"))
		if dr.has("notes"):
			if not (dr.get("notes") is String) or not (String(dr.get("notes")) in CIVIC_NOTES):
				return {"ok": false}
			clean_draft["notes"] = String(dr.get("notes"))
	var clean_result: Dictionary = {}
	if cv.has("result") and cv.get("result") != null:
		var r_val: Variant = cv.get("result")
		if not is_valid_civic_plan(r_val):
			return {"ok": false}
		clean_result = copy_civic_plan(r_val as Dictionary)
	if ph in ["meeting", "done"]:
		if clean_result.is_empty():
			return {"ok": false}
		clean_draft = copy_civic_plan(clean_result)
	elif not clean_result.is_empty():
		return {"ok": false}
	if not allow_civic:
		if ph != "idle":
			return {"ok": false}
		return {"ok": true, "phase": "idle", "draft": default_civic_draft(), "result": {}}
	return {"ok": true, "phase": ph, "draft": clean_draft, "result": clean_result}

func validate_godot_film(raw_film: Variant, allow_film: bool) -> Dictionary:
	if not (raw_film is Dictionary):
		return {"ok": false}
	var fm: Dictionary = raw_film
	var ph_val: Variant = fm.get("phase", "idle")
	if not (ph_val is String) or not (String(ph_val) in ["idle", "planning", "hold", "shooting", "done"]):
		return {"ok": false}
	var ph := String(ph_val)
	var clean_draft := default_film_draft()
	if fm.has("draft"):
		var dr_val: Variant = fm.get("draft")
		if not (dr_val is Dictionary):
			return {"ok": false}
		var dr: Dictionary = dr_val
		if dr.has("framing"):
			if not (dr.get("framing") is String) or not (String(dr.get("framing")) in FILM_FRAMING):
				return {"ok": false}
			clean_draft["framing"] = String(dr.get("framing"))
		if dr.has("plan"):
			if not (dr.get("plan") is String) or not (String(dr.get("plan")) in FILM_PLANS):
				return {"ok": false}
			clean_draft["plan"] = String(dr.get("plan"))
		if dr.has("order"):
			var ord_val: Variant = dr.get("order")
			if not is_valid_film_order(ord_val):
				return {"ok": false}
			var c_ord: Array[String] = []
			for s_item in (ord_val as Array):
				c_ord.append(String(s_item))
			clean_draft["order"] = c_ord
	var clean_result: Dictionary = {}
	if fm.has("result") and fm.get("result") != null:
		var r_val: Variant = fm.get("result")
		if not is_valid_film_plan(r_val):
			return {"ok": false}
		clean_result = copy_film_plan(r_val as Dictionary)
	var clean_cap: Array[String] = []
	if fm.has("captured"):
		var cap_val: Variant = fm.get("captured")
		if not (cap_val is Array) or (cap_val as Array).size() > FILM_SHOTS.size():
			return {"ok": false}
		for c_item in (cap_val as Array):
			if not (c_item is String) or not (String(c_item) in FILM_SHOTS):
				return {"ok": false}
			clean_cap.append(String(c_item))
	if ph in ["idle", "planning"]:
		if not clean_result.is_empty() or not clean_cap.is_empty():
			return {"ok": false}
	elif ph == "hold":
		if clean_result.is_empty() or not clean_cap.is_empty():
			return {"ok": false}
		clean_draft = copy_film_plan(clean_result)
	elif ph == "shooting":
		if clean_result.is_empty() or clean_cap.size() >= FILM_SHOTS.size():
			return {"ok": false}
		var r_ord: Array = clean_result.get("order", [])
		for i in range(clean_cap.size()):
			if clean_cap[i] != String(r_ord[i]):
				return {"ok": false}
		clean_draft = copy_film_plan(clean_result)
	elif ph == "done":
		if clean_result.is_empty() or clean_cap.size() != FILM_SHOTS.size():
			return {"ok": false}
		var r_ord_d: Array = clean_result.get("order", [])
		for i in range(FILM_SHOTS.size()):
			if clean_cap[i] != String(r_ord_d[i]):
				return {"ok": false}
		clean_draft = copy_film_plan(clean_result)
	if not allow_film:
		if ph != "idle":
			return {"ok": false}
		return {"ok": true, "phase": "idle", "draft": default_film_draft(), "result": {}, "captured": [] as Array[String]}
	return {"ok": true, "phase": ph, "draft": clean_draft, "result": clean_result, "captured": clean_cap}

func validate_godot_optional(raw_opt: Variant) -> Dictionary:
	if not (raw_opt is Dictionary):
		return {"ok": false}
	var serialized := JSON.stringify(raw_opt)
	if serialized.length() > OPTIONAL_SAVE_MAX_BYTES:
		return {"ok": false}
	return {"ok": true, "optional": (raw_opt as Dictionary).duplicate(true)}

func apply_save_envelope(raw_json: String) -> bool:
	if reward_audio_player != null:
		reward_audio_player.stop()
	var trimmed := raw_json.strip_edges()
	if trimmed.is_empty():
		reset_mural_state_to_defaults("fresh")
		return false
	if not trimmed.begins_with("{") or not trimmed.ends_with("}"):
		reset_mural_state_to_defaults("recovered")
		return false
	var parsed: Variant = JSON.parse_string(trimmed)
	if not parsed is Dictionary:
		reset_mural_state_to_defaults("recovered")
		return false
	var env: Dictionary = parsed
	if String(env.get("schema", "")) != "tenderloin-redux.godot.save":
		reset_mural_state_to_defaults("recovered")
		return false
	var ver_val: Variant = env.get("version", -1)
	if not is_whole_json_number(ver_val) or int(roundf(float(ver_val))) != GODOT_SAVE_VERSION:
		reset_mural_state_to_defaults("recovered")
		return false
	var pal_id := String(env.get("mural_palette", ""))
	if not pal_id in MURAL_PALETTES:
		reset_mural_state_to_defaults("recovered")
		return false
	var talk_val: Variant = env.get("celeste_talk_count", 0)
	if not is_whole_json_number(talk_val) or int(roundf(float(talk_val))) < 0:
		reset_mural_state_to_defaults("recovered")
		return false
	var sc_done := false
	if env.has("rook_soundcheck_done"):
		var sc_val: Variant = env.get("rook_soundcheck_done")
		if not (sc_val is bool):
			reset_mural_state_to_defaults("recovered")
			return false
		sc_done = bool(sc_val)
	var bo_done := false
	if env.has("block_opened"):
		var bo_val: Variant = env.get("block_opened")
		if not (bo_val is bool):
			reset_mural_state_to_defaults("recovered")
			return false
		bo_done = bool(bo_val)
	var hr_done := false
	if env.has("history_read"):
		var hr_val: Variant = env.get("history_read")
		if not (hr_val is bool):
			reset_mural_state_to_defaults("recovered")
			return false
		hr_done = bool(hr_val)
	var bh_done := false
	if env.has("blackhawk_discovered"):
		var bh_val: Variant = env.get("blackhawk_discovered")
		if not (bh_val is bool):
			reset_mural_state_to_defaults("recovered")
			return false
		bh_done = bool(bh_val)
	var db_vis := true
	if env.has("district_boundary_visible"):
		var db_val: Variant = env.get("district_boundary_visible")
		if not (db_val is bool):
			reset_mural_state_to_defaults("recovered")
			return false
		db_vis = bool(db_val)
	var clean_visited: Dictionary = {}
	if env.has("visited_neighbors"):
		var vn_val: Variant = env.get("visited_neighbors")
		if not (vn_val is Array):
			reset_mural_state_to_defaults("recovered")
			return false
		var known_ids := valid_neighbor_ids()
		var vn_arr: Array = vn_val
		for item in vn_arr:
			if not (item is String) or not (String(item) in known_ids):
				reset_mural_state_to_defaults("recovered")
				return false
			clean_visited[String(item)] = true
	var m_check := validate_mural_dict(env.get("mural_placements", null), false)
	if not bool(m_check.get("ok", false)):
		reset_mural_state_to_defaults("recovered")
		return false
	var clean_placements: Dictionary = m_check.get("placements", {})
	var will_open := bo_done and clean_visited.size() >= neighbors.size() and clean_placements.size() == MURAL_MOTIFS.size() and sc_done
	var ep_res := {"ok": true, "photo": default_keepsake_photo(), "packing": false, "returned": [] as Array[String]}
	if env.has("epilogue"):
		ep_res = validate_godot_epilogue(env.get("epilogue"), will_open, pal_id)
		if not bool(ep_res.get("ok", false)):
			reset_mural_state_to_defaults("recovered")
			return false
	var prog_res := {"ok": true, "order": [] as Array[String], "published": [] as Array[String]}
	if env.has("programme"):
		prog_res = validate_godot_programme(env.get("programme"), will_open)
		if not bool(prog_res.get("ok", false)):
			reset_mural_state_to_defaults("recovered")
			return false
	var host_res := {"ok": true, "order": [] as Array[String], "results": [] as Array[Dictionary], "draft": default_hosting_draft()}
	if env.has("hosting"):
		host_res = validate_godot_hosting(env.get("hosting"), will_open)
		if not bool(host_res.get("ok", false)):
			reset_mural_state_to_defaults("recovered")
			return false
	var host_done := will_open and (host_res.get("order", []) as Array).size() == PROGRAMME_SEGMENTS.size() and (host_res.get("results", []) as Array).size() == PROGRAMME_SEGMENTS.size()
	var civic_res := {"ok": true, "phase": "idle", "draft": default_civic_draft(), "result": {}}
	if env.has("civic"):
		civic_res = validate_godot_civic(env.get("civic"), host_done)
		if not bool(civic_res.get("ok", false)):
			reset_mural_state_to_defaults("recovered")
			return false
	var civic_done := host_done and String(civic_res.get("phase", "idle")) == "done"
	var film_res := {"ok": true, "phase": "idle", "draft": default_film_draft(), "result": {}, "captured": [] as Array[String]}
	if env.has("film"):
		film_res = validate_godot_film(env.get("film"), civic_done)
		if not bool(film_res.get("ok", false)):
			reset_mural_state_to_defaults("recovered")
			return false
	var opt_res := {"ok": true, "optional": {}}
	if env.has("optional"):
		opt_res = validate_godot_optional(env.get("optional"))
		if not bool(opt_res.get("ok", false)):
			opt_res = {"ok": true, "optional": {}}
	var seq_val: Variant = env.get("save_seq", 0)
	if is_whole_json_number(seq_val):
		save_seq = maxi(save_seq, int(roundf(float(seq_val))))
	celeste_talk_count = maxi(0, int(roundf(float(talk_val))))
	mural_palette = pal_id
	var act_id := String(env.get("active_motif", "sun"))
	active_motif = act_id if act_id in MURAL_MOTIFS else "sun"
	mural_placements = clean_placements
	rook_soundcheck_done = sc_done
	visited_neighbors = clean_visited
	last_panel_dialogue = ""
	discovered_surprises.clear()
	surprise_guide_idx = -1
	last_hinted_surprise_id = ""
	museum_hub_step = 0
	active_time_era = "present"
	visited_museum_eras.clear()
	landmark_tour_celebrated = false
	boeddeker_park_visited = false
	so_what_visited = false
	eatery_guide_idx = -1
	eatery_order_counts.clear()
	for counter in eatery_counter_nodes:
		counter.visible = false
	last_reward_title = ""
	hide_speech_bubble()
	reward_banner_timer = 0.0
	if reward_banner != null:
		reward_banner.visible = false
	celebration_burst_timer = 0.0
	if celebration_burst_node != null:
		celebration_burst_node.visible = false
	# Additive optional field: gracefully filters unknown entries rather than hard-resetting v1 saves.
	# Forward-only compatibility: downgrading to a pre-surprise client build is not a supported path.
	var raw_surprises: Variant = env.get("discovered_surprises", [])
	if raw_surprises is Array:
		for s_entry in raw_surprises:
			if s_entry is String and String(s_entry) in NEIGHBORHOOD_SURPRISE_IDS:
				discovered_surprises[String(s_entry)] = true
	history_read = hr_done
	blackhawk_discovered = bh_done
	district_boundary_visible = db_vis
	block_opened = will_open
	keepsake_photo = ep_res.get("photo", default_keepsake_photo())
	var lay_val: Variant = env.get("gathering_layout", "")
	gathering_layout = String(lay_val) if (lay_val is String and String(lay_val) in GATHERING_LAYOUTS) else ""
	if block_opened and gathering_layout == "":
		var kp_lay := String(keepsake_photo.get("layout", "table"))
		gathering_layout = kp_lay if kp_lay in GATHERING_LAYOUTS else "table"
	last_exported_keepsake_svg = ""
	epilogue_packing = bool(ep_res.get("packing", false))
	epilogue_returned = ep_res.get("returned", [] as Array[String])
	programme_order = prog_res.get("order", [] as Array[String])
	programme_published = prog_res.get("published", [] as Array[String])
	hosting_order = host_res.get("order", [] as Array[String])
	hosting_results = host_res.get("results", [] as Array[Dictionary])
	hosting_draft = host_res.get("draft", default_hosting_draft())
	civic_phase = String(civic_res.get("phase", "idle"))
	civic_draft = civic_res.get("draft", default_civic_draft())
	civic_result = civic_res.get("result", {})
	film_phase = String(film_res.get("phase", "idle"))
	film_draft = film_res.get("draft", default_film_draft())
	film_result = film_res.get("result", {})
	film_captured = film_res.get("captured", [] as Array[String])
	film_screen_frame = 0
	optional_save_data = opt_res.get("optional", {})
	stop_music_playback()
	sketch_tick = 0
	sketch_phase = 0.0
	sketch_frames_pushed = 0
	music_mode = "sketch"
	local_music_name = ""
	music_error = ""
	if local_audio_player != null:
		local_audio_player.stream = null
	save_load_status = "restored"
	update_mural_3d()
	update_speaker_3d()
	update_block_3d()
	update_district_boundary_3d()
	update_history_stops_3d()
	update_neighborhood_surprises_3d()
	update_museum_portal_3d()
	update_mural_ui()
	update_music_ui()
	update_block_ui()
	sync_web_a11y_status()
	return true

func browser_furniture_cells(item_id: String, col: int, row: int, layout_id: String) -> Array[Vector2i]:
	var vertical := (item_id == "table" and layout_id == "floor")
	return [
		Vector2i(col, row),
		Vector2i(col + (0 if vertical else 1), row + (1 if vertical else 0))
	]

func can_place_browser_furniture(placed: Dictionary, item_id: String, col: int, row: int, layout_id: String) -> bool:
	if not (layout_id in ["table", "floor"]) or not (item_id in BROWSER_FURNITURE_IDS):
		return false
	var cells := browser_furniture_cells(item_id, col, row, layout_id)
	for c in cells:
		if c.x < 0 or c.x > 7 or c.y < 0 or c.y > 4 or c.y == 2:
			return false
	for other_key in placed.keys():
		var other_id := String(other_key)
		if other_id == item_id:
			continue
		var other_pos: Dictionary = placed[other_key]
		var other_cells := browser_furniture_cells(other_id, int(other_pos.get("col", -1)), int(other_pos.get("row", -1)), layout_id)
		for a in cells:
			for b in other_cells:
				if a == b:
					return false
	return true

func inspect_browser_save_json(raw_json: String) -> Dictionary:
	if raw_json.is_empty() or raw_json.length() > BROWSER_SAVE_MAX_BYTES:
		return {"valid": false, "error": "empty_or_too_large"}
	var trimmed := raw_json.strip_edges()
	if not trimmed.begins_with("{") or not trimmed.ends_with("}"):
		return {"valid": false, "error": "malformed_json"}
	var parsed: Variant = JSON.parse_string(trimmed)
	if not (parsed is Dictionary):
		return {"valid": false, "error": "malformed_json"}
	var env: Dictionary = parsed
	var ver_val: Variant = env.get("version", null)
	var core_val: Variant = env.get("core", null)
	if not is_whole_json_number(ver_val) or int(roundf(float(ver_val))) != 1 or not (core_val is Dictionary):
		return {"valid": false, "error": "unsupported_envelope"}
	var saved: Dictionary = core_val
	var greeted := (saved.get("greeted", false) is bool) and bool(saved.get("greeted", false))
	var layout_id := ""
	if greeted and (saved.get("layout", null) is String):
		var cand_layout := String(saved.get("layout", ""))
		if cand_layout in ["table", "floor"]:
			layout_id = cand_layout
	var clean_furniture: Dictionary = {}
	if saved.get("furniture", null) is Dictionary:
		var raw_furn: Dictionary = saved.get("furniture")
		for f_id in BROWSER_FURNITURE_IDS:
			var fp: Variant = raw_furn.get(f_id, null)
			if fp is Dictionary:
				var f_dict: Dictionary = fp
				var fc: Variant = f_dict.get("col", null)
				var fr: Variant = f_dict.get("row", null)
				if is_whole_json_number(fc) and is_whole_json_number(fr):
					var c_i := int(roundf(float(fc)))
					var r_i := int(roundf(float(fr)))
					if can_place_browser_furniture(clean_furniture, f_id, c_i, r_i, layout_id):
						clean_furniture[f_id] = {"col": c_i, "row": r_i}
	var layout_ready := (layout_id != "" and clean_furniture.size() == BROWSER_FURNITURE_IDS.size())
	var clean_litter: Array[String] = []
	if saved.get("litter", null) is Array:
		var raw_lit: Array = saved.get("litter")
		for lit_id in BROWSER_LITTER_IDS:
			for item in raw_lit:
				if (item is String) and String(item) == lit_id:
					clean_litter.append(lit_id)
					break
	var tidy_ready := (clean_litter.size() == BROWSER_LITTER_IDS.size())
	var clean_mural: Dictionary = {}
	var occ_mural: Dictionary = {}
	if saved.get("mural", null) is Dictionary:
		var raw_mural: Dictionary = saved.get("mural")
		for m_id in MURAL_MOTIFS:
			var mp: Variant = raw_mural.get(m_id, null)
			if mp is Dictionary:
				var m_dict: Dictionary = mp
				var mc: Variant = m_dict.get("col", null)
				var mr: Variant = m_dict.get("row", null)
				if is_whole_json_number(mc) and is_whole_json_number(mr):
					var mc_i := int(roundf(float(mc)))
					var mr_i := int(roundf(float(mr)))
					if is_valid_mural_cell(mc_i, mr_i):
						var m_key := "%d,%d" % [mc_i, mr_i]
						if not occ_mural.has(m_key):
							occ_mural[m_key] = true
							clean_mural[m_id] = {"col": mc_i, "row": mr_i}
	var mural_ready := (clean_mural.size() == MURAL_MOTIFS.size())
	var pal_id := "garden"
	if (saved.get("palette", null) is String) and String(saved.get("palette")) in MURAL_PALETTES:
		pal_id = String(saved.get("palette"))
	var sc_done := (saved.get("soundcheck", false) is bool) and bool(saved.get("soundcheck", false)) and layout_ready
	var opened_done := (saved.get("opened", false) is bool) and bool(saved.get("opened", false)) and layout_ready and tidy_ready and mural_ready and sc_done
	var history_flag := (saved.get("history", false) is bool) and bool(saved.get("history", false))
	var blackhawk_flag := (saved.get("blackhawk", false) is bool) and bool(saved.get("blackhawk", false))
	var clean_epilogue := {"photo": default_keepsake_photo(), "packing": false, "returned": [] as Array[String]}
	clean_epilogue["photo"]["palette"] = pal_id
	clean_epilogue["photo"]["layout"] = layout_id if layout_id != "" else "table"
	if opened_done and (saved.get("epilogue", null) is Dictionary):
		var raw_ep: Dictionary = saved.get("epilogue")
		var pk := (raw_ep.get("packing", false) is bool) and bool(raw_ep.get("packing", false))
		var ret_list: Array[String] = []
		if pk and (raw_ep.get("returned", null) is Array):
			var raw_ret: Array = raw_ep.get("returned")
			for lid in LOAN_IDS:
				for r_item in raw_ret:
					if (r_item is String) and String(r_item) == lid:
						ret_list.append(lid)
						break
		var ph_status := "skipped" if pk else "unasked"
		var ph_parts: Array[String] = []
		var ph_mural: Dictionary = {}
		var ph_pal := pal_id
		var ph_lay := layout_id if layout_id != "" else "table"
		if raw_ep.get("photo", null) is Dictionary:
			var raw_ph: Dictionary = raw_ep.get("photo")
			var cand_st := String(raw_ph.get("status", "")) if (raw_ph.get("status", null) is String) else ""
			if cand_st == "skipped":
				ph_status = "skipped"
			elif cand_st == "taken":
				var raw_p_val: Variant = raw_ph.get("participants", null)
				var raw_lay_val: Variant = raw_ph.get("layout", null)
				var raw_pal_val: Variant = raw_ph.get("palette", null)
				var m_chk := validate_mural_dict(raw_ph.get("mural", null), true)
				var all_p_valid := (raw_p_val is Array) and not (raw_p_val as Array).is_empty()
				if all_p_valid:
					for p_item in (raw_p_val as Array):
						if not (p_item is String) or not (String(p_item) in PHOTO_GUESTS):
							all_p_valid = false
							break
				if all_p_valid and (raw_lay_val is String) and (String(raw_lay_val) in ["table", "floor"]) and (raw_pal_val is String) and (String(raw_pal_val) in MURAL_PALETTES) and bool(m_chk.get("ok", false)):
					var raw_p_arr: Array = raw_p_val
					for gid in PHOTO_GUESTS:
						if raw_p_arr.has(gid):
							ph_parts.append(gid)
					ph_mural = m_chk.get("placements", {})
					ph_pal = String(raw_pal_val)
					ph_lay = String(raw_lay_val)
					ph_status = "taken"
			if pk and ph_status == "unasked":
				ph_status = "skipped"
		clean_epilogue = {
			"photo": {
				"status": ph_status,
				"participants": ph_parts if ph_status == "taken" else ([] as Array[String]),
				"mural": ph_mural if ph_status == "taken" else {},
				"palette": ph_pal,
				"layout": ph_lay
			},
			"packing": pk,
			"returned": ret_list
		}
	var clean_prog_order: Array[String] = []
	var clean_prog_pub: Array[String] = []
	if opened_done and (saved.get("programme", null) is Dictionary):
		var raw_pr: Dictionary = saved.get("programme")
		if raw_pr.get("order", null) is Array:
			for item in raw_pr.get("order"):
				if (item is String) and (String(item) in PROGRAMME_SEGMENTS) and not clean_prog_order.has(String(item)):
					clean_prog_order.append(String(item))
		if raw_pr.get("published", null) is Array:
			var cand_pub: Array = raw_pr.get("published")
			if cand_pub.size() == PROGRAMME_SEGMENTS.size() and programme_issue(cand_pub) == "":
				for item in cand_pub:
					clean_prog_pub.append(String(item))
	var clean_host_order: Array[String] = []
	var clean_host_results: Array[Dictionary] = []
	var clean_host_draft := default_hosting_draft()
	if opened_done and (saved.get("hosting", null) is Dictionary):
		var raw_ho: Dictionary = saved.get("hosting")
		if raw_ho.get("order", null) is Array:
			var cand_ho: Array = raw_ho.get("order")
			if cand_ho.size() == PROGRAMME_SEGMENTS.size() and programme_issue(cand_ho) == "":
				for item in cand_ho:
					clean_host_order.append(String(item))
		if not clean_host_order.is_empty():
			if raw_ho.get("results", null) is Array:
				var raw_res: Array = raw_ho.get("results")
				for i in range(mini(raw_res.size(), clean_host_order.size())):
					var r_item: Variant = raw_res[i]
					var exp_id := clean_host_order[i]
					if not (r_item is Dictionary) or String(r_item.get("id", "")) != exp_id:
						break
					var rv: Variant = r_item.get("value", null)
					if exp_id == "stories" and (rv is String) and (String(rv) in HOSTING_STORIES):
						clean_host_results.append({"id": "stories", "value": String(rv)})
					elif exp_id == "beats" and is_whole_json_number(rv) and int(roundf(float(rv))) >= 0 and int(roundf(float(rv))) <= 255:
						clean_host_results.append({"id": "beats", "value": int(roundf(float(rv)))})
					elif exp_id == "art" and (rv is Dictionary) and (rv.get("palette", null) is String) and (String(rv.get("palette")) in HOSTING_PALETTES) and (rv.get("tiles", null) is Array) and rv.get("tiles").size() == 6:
						var ok_tiles := true
						var ct: Array[int] = []
						for tv in rv.get("tiles"):
							if not is_whole_json_number(tv) or int(roundf(float(tv))) < 0 or int(roundf(float(tv))) > 2:
								ok_tiles = false
								break
							ct.append(int(roundf(float(tv))))
						if not ok_tiles:
							break
						clean_host_results.append({"id": "art", "value": {"palette": String(rv.get("palette")), "tiles": ct}})
					elif exp_id == "pause" and (rv is String) and (String(rv) in HOSTING_QUIETS):
						clean_host_results.append({"id": "pause", "value": String(rv)})
					else:
						break
			if raw_ho.get("draft", null) is Dictionary:
				var dr: Dictionary = raw_ho.get("draft")
				if (dr.get("story", null) is String) and String(dr.get("story")) in HOSTING_STORIES:
					clean_host_draft["story"] = String(dr.get("story"))
				if is_whole_json_number(dr.get("pattern", null)) and int(roundf(float(dr.get("pattern")))) >= 0 and int(roundf(float(dr.get("pattern")))) <= 255:
					clean_host_draft["pattern"] = int(roundf(float(dr.get("pattern"))))
				if (dr.get("palette", null) is String) and String(dr.get("palette")) in HOSTING_PALETTES:
					clean_host_draft["palette"] = String(dr.get("palette"))
				if (dr.get("quiet", null) is String) and String(dr.get("quiet")) in HOSTING_QUIETS:
					clean_host_draft["quiet"] = String(dr.get("quiet"))
				if (dr.get("tiles", null) is Array) and dr.get("tiles").size() == 6:
					var dt: Array[int] = []
					var ok_dt := true
					for tv in dr.get("tiles"):
						if not is_whole_json_number(tv) or int(roundf(float(tv))) < 0 or int(roundf(float(tv))) > 2:
							ok_dt = false
							break
						dt.append(int(roundf(float(tv))))
					if ok_dt:
						clean_host_draft["tiles"] = dt
	var civic_avail := opened_done and clean_host_results.size() == PROGRAMME_SEGMENTS.size()
	var clean_civic := {"phase": "idle", "draft": default_civic_draft(), "result": {}}
	if civic_avail and (saved.get("civic", null) is Dictionary):
		var raw_cv: Dictionary = saved.get("civic")
		var cv_ph := String(raw_cv.get("phase", "")) if (raw_cv.get("phase", null) is String) else ""
		if cv_ph in ["planning", "meeting", "done"]:
			clean_civic["phase"] = "planning"
			if raw_cv.get("draft", null) is Dictionary:
				var cv_dr: Dictionary = raw_cv.get("draft")
				if (cv_dr.get("topic", null) is String) and String(cv_dr.get("topic")) in CIVIC_TOPICS:
					clean_civic["draft"]["topic"] = String(cv_dr.get("topic"))
				if (cv_dr.get("format", null) is String) and String(cv_dr.get("format")) in CIVIC_FORMATS:
					clean_civic["draft"]["format"] = String(cv_dr.get("format"))
				if (cv_dr.get("notes", null) is String) and String(cv_dr.get("notes")) in CIVIC_NOTES:
					clean_civic["draft"]["notes"] = String(cv_dr.get("notes"))
			if (cv_ph in ["meeting", "done"]) and is_valid_civic_plan(raw_cv.get("result", null)):
				var cv_res := copy_civic_plan(raw_cv.get("result") as Dictionary)
				clean_civic["phase"] = cv_ph
				clean_civic["result"] = cv_res
				clean_civic["draft"] = copy_civic_plan(cv_res)
	var film_avail := opened_done and String(clean_civic.get("phase", "idle")) == "done"
	var clean_film := {"phase": "idle", "draft": default_film_draft(), "result": {}, "captured": [] as Array[String]}
	if film_avail and (saved.get("film", null) is Dictionary):
		var raw_fm: Dictionary = saved.get("film")
		var fm_ph := String(raw_fm.get("phase", "")) if (raw_fm.get("phase", null) is String) else ""
		if fm_ph in ["planning", "hold", "shooting", "done"]:
			clean_film["phase"] = "planning"
			if raw_fm.get("draft", null) is Dictionary:
				var fm_dr: Dictionary = raw_fm.get("draft")
				if (fm_dr.get("framing", null) is String) and String(fm_dr.get("framing")) in FILM_FRAMING:
					clean_film["draft"]["framing"] = String(fm_dr.get("framing"))
				if (fm_dr.get("plan", null) is String) and String(fm_dr.get("plan")) in FILM_PLANS:
					clean_film["draft"]["plan"] = String(fm_dr.get("plan"))
				if is_valid_film_order(fm_dr.get("order", null)):
					var f_ord: Array[String] = []
					for s_item in (fm_dr.get("order") as Array):
						f_ord.append(String(s_item))
					clean_film["draft"]["order"] = f_ord
			if fm_ph != "planning" and is_valid_film_plan(raw_fm.get("result", null)):
				var fm_res := copy_film_plan(raw_fm.get("result") as Dictionary)
				clean_film["result"] = fm_res
				clean_film["draft"] = copy_film_plan(fm_res)
				if fm_ph == "hold":
					clean_film["phase"] = "hold"
				else:
					clean_film["phase"] = "shooting"
					var f_cap: Array[String] = []
					if raw_fm.get("captured", null) is Array:
						var raw_cap: Array = raw_fm.get("captured")
						var res_ord: Array = fm_res.get("order", [])
						for i in range(mini(raw_cap.size(), res_ord.size())):
							if (raw_cap[i] is String) and String(raw_cap[i]) == String(res_ord[i]):
								f_cap.append(String(raw_cap[i]))
							else:
								break
					clean_film["captured"] = f_cap
					if f_cap.size() == FILM_SHOTS.size():
						clean_film["phase"] = "done"
	var clean_optional: Dictionary = {}
	if env.get("optional", null) is Dictionary:
		var cand_opt: Dictionary = env.get("optional")
		if JSON.stringify(cand_opt).length() <= OPTIONAL_SAVE_MAX_BYTES:
			clean_optional = cand_opt.duplicate(true)
	return {
		"valid": true,
		"greeted": greeted,
		"layout": layout_id,
		"furniture_count": clean_furniture.size(),
		"layout_ready": layout_ready,
		"tidy_count": clean_litter.size(),
		"tidy_ready": tidy_ready,
		"mural": clean_mural,
		"mural_count": clean_mural.size(),
		"mural_ready": mural_ready,
		"palette": pal_id,
		"soundcheck": sc_done,
		"opened": opened_done,
		"history": history_flag,
		"blackhawk": blackhawk_flag,
		"epilogue": clean_epilogue,
		"programme": {"order": clean_prog_order, "published": clean_prog_pub},
		"hosting": {"order": clean_host_order, "results": clean_host_results, "draft": clean_host_draft},
		"civic": clean_civic,
		"film": clean_film,
		"optional": clean_optional
	}

func civic_phase_rank(ph: String) -> int:
	match ph:
		"planning": return 1
		"meeting": return 2
		"done": return 3
		_: return 0

func film_phase_rank(ph: String) -> int:
	match ph:
		"planning": return 1
		"hold": return 2
		"shooting": return 3
		"done": return 4
		_: return 0

func import_browser_save_json(raw_json: String) -> bool:
	var res := inspect_browser_save_json(raw_json)
	if not bool(res.get("valid", false)):
		browser_import_status = "error"
		browser_import_message = "Browser save not imported (invalid or absent v1 save); Godot progress kept."
		update_block_ui()
		info.text = "%s\nBrowser save ('%s') is read-only and never overwritten by Godot\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [browser_import_message, BROWSER_WEB_STORAGE_KEY]
		announce_a11y_status(browser_import_message)
		return false
	var imported_mural: Dictionary = res.get("mural", {})
	if imported_mural.size() >= mural_placements.size():
		if not imported_mural.is_empty():
			mural_placements = imported_mural.duplicate(true)
		mural_palette = String(res.get("palette", "garden"))
	if not mural_placements.is_empty():
		celeste_talk_count = maxi(1, celeste_talk_count)
	rook_soundcheck_done = rook_soundcheck_done or bool(res.get("soundcheck", false))
	history_read = history_read or bool(res.get("history", false))
	blackhawk_discovered = blackhawk_discovered or bool(res.get("blackhawk", false))
	var next_visited: Dictionary = visited_neighbors.duplicate()
	if bool(res.get("greeted", false)):
		next_visited["bea"] = true
	if not mural_placements.is_empty():
		next_visited["celeste"] = true
	if rook_soundcheck_done:
		next_visited["rook"] = true
	if int(res.get("tidy_count", 0)) > 0:
		next_visited["dez"] = true
	if String(res.get("layout", "")) != "" or int(res.get("furniture_count", 0)) > 0:
		next_visited["thanh"] = true
	if bool(res.get("opened", false)):
		for nid in valid_neighbor_ids():
			next_visited[nid] = true
	visited_neighbors = next_visited
	if not (gathering_layout in GATHERING_LAYOUTS) and String(res.get("layout", "")) in GATHERING_LAYOUTS:
		gathering_layout = String(res.get("layout", ""))
	block_opened = (block_opened or bool(res.get("opened", false))) and (visited_neighbors.size() >= neighbors.size() and mural_placements.size() == MURAL_MOTIFS.size() and rook_soundcheck_done)
	if block_opened:
		var imp_ep: Dictionary = res.get("epilogue", {})
		var imp_ph: Dictionary = imp_ep.get("photo", {})
		var cur_st := String(keepsake_photo.get("status", "unasked"))
		var imp_st := String(imp_ph.get("status", "unasked"))
		if cur_st != "taken" and imp_st == "taken":
			keepsake_photo = imp_ph.duplicate(true)
		elif cur_st == "unasked" and imp_st == "skipped":
			keepsake_photo = imp_ph.duplicate(true)
		epilogue_packing = epilogue_packing or bool(imp_ep.get("packing", false))
		if epilogue_packing and String(keepsake_photo.get("status", "unasked")) == "unasked":
			keepsake_photo["status"] = "skipped"
		var imp_ret: Array = imp_ep.get("returned", [])
		var merged_ret: Array[String] = []
		for lid in LOAN_IDS:
			if epilogue_returned.has(lid) or imp_ret.has(lid):
				merged_ret.append(lid)
		epilogue_returned = merged_ret
		var imp_pr: Dictionary = res.get("programme", {})
		var imp_pr_ord: Array = imp_pr.get("order", [])
		var imp_pr_pub: Array = imp_pr.get("published", [])
		if imp_pr_ord.size() > programme_order.size():
			programme_order.clear()
			for sid in imp_pr_ord:
				programme_order.append(String(sid))
		if programme_published.is_empty() and imp_pr_pub.size() == PROGRAMME_SEGMENTS.size():
			programme_published.clear()
			for sid in imp_pr_pub:
				programme_published.append(String(sid))
		var imp_ho: Dictionary = res.get("hosting", {})
		var imp_ho_ord: Array = imp_ho.get("order", [])
		var imp_ho_res: Array = imp_ho.get("results", [])
		if hosting_order.is_empty() and imp_ho_ord.size() == PROGRAMME_SEGMENTS.size():
			for sid in imp_ho_ord:
				hosting_order.append(String(sid))
		if imp_ho_res.size() > hosting_results.size() and imp_ho_ord.size() == PROGRAMME_SEGMENTS.size():
			hosting_order.clear()
			for sid in imp_ho_ord:
				hosting_order.append(String(sid))
			hosting_results = imp_ho_res.duplicate(true)
			if imp_ho.get("draft", null) is Dictionary:
				hosting_draft = imp_ho.get("draft").duplicate(true)
		if is_civic_available():
			var imp_cv: Dictionary = res.get("civic", {})
			var imp_cv_ph := String(imp_cv.get("phase", "idle"))
			if civic_phase_rank(imp_cv_ph) > civic_phase_rank(civic_phase):
				civic_phase = imp_cv_ph
				if imp_cv.get("draft", null) is Dictionary:
					civic_draft = copy_civic_plan(imp_cv.get("draft"))
				civic_result = copy_civic_plan(imp_cv.get("result")) if is_valid_civic_plan(imp_cv.get("result", null)) else {}
		if is_film_available():
			var imp_fm: Dictionary = res.get("film", {})
			var imp_fm_ph := String(imp_fm.get("phase", "idle"))
			var imp_fm_cap: Array = imp_fm.get("captured", [])
			if film_phase_rank(imp_fm_ph) > film_phase_rank(film_phase) or (imp_fm_ph == "shooting" and film_phase == "shooting" and imp_fm_cap.size() > film_captured.size()):
				film_phase = imp_fm_ph
				if imp_fm.get("draft", null) is Dictionary:
					film_draft = copy_film_plan(imp_fm.get("draft"))
				film_result = copy_film_plan(imp_fm.get("result")) if is_valid_film_plan(imp_fm.get("result", null)) else {}
				film_captured.clear()
				for s_item in imp_fm_cap:
					film_captured.append(String(s_item))
				film_screen_frame = 0
	var imp_opt: Dictionary = res.get("optional", {})
	if not imp_opt.is_empty():
		var merged_opt := optional_save_data.duplicate(true)
		for k in imp_opt.keys():
			merged_opt[k] = imp_opt[k]
		if JSON.stringify(merged_opt).length() <= OPTIONAL_SAVE_MAX_BYTES:
			optional_save_data = merged_opt
	update_mural_3d()
	update_speaker_3d()
	update_block_3d()
	update_history_stops_3d()
	browser_import_status = "imported"
	var state_tag := "Gathering Open" if block_opened else ("Ready" if is_block_ready() else "In progress")
	browser_import_message = "Imported browser v1 save: %d/5 neighbors · %d/3 mural (%s) · %s" % [visited_neighbors.size(), mural_placements.size(), mural_palette.capitalize(), state_tag]
	save_godot_state()
	trigger_progress_cue("browser_save_import", "Browser v1 save")
	update_mural_ui()
	update_music_ui()
	update_block_ui()
	info.text = "%s\nBrowser save ('%s') preserved untouched · Saved to Godot storage\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [browser_import_message, BROWSER_WEB_STORAGE_KEY]
	announce_a11y_status(browser_import_message)
	return true

func import_browser_save_from_web_storage() -> bool:
	show_block_panel(true)
	if not OS.has_feature("web"):
		browser_import_status = "error"
		browser_import_message = "Browser save localStorage import is only available in the Web build."
		update_block_ui()
		info.text = "%s\nCall import_browser_save_json(raw_json) in native/headless tests\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % browser_import_message
		announce_a11y_status(browser_import_message)
		return false
	var raw_str := ""
	var web_val: Variant = JavaScriptBridge.eval("try { window.localStorage.getItem('%s') || ''; } catch (_e) { ''; }" % BROWSER_WEB_STORAGE_KEY, true)
	if web_val is String:
		raw_str = String(web_val)
	if raw_str.strip_edges().is_empty():
		JavaScriptBridge.eval("window.__tenderloinOpenSavePicker && window.__tenderloinOpenSavePicker();", true)
		browser_import_status = "picker"
		browser_import_message = "Choose a browser v1 save JSON file to import."
		update_block_ui()
		info.text = "%s\nBrowser save ('%s') is read-only and never overwritten by Godot\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [browser_import_message, BROWSER_WEB_STORAGE_KEY]
		announce_a11y_status(browser_import_message)
		return false
	return import_browser_save_json(raw_str)

func extract_candidate_save_seq(raw_json: String) -> int:
	var trimmed := raw_json.strip_edges()
	if not trimmed.begins_with("{") or not trimmed.ends_with("}"):
		return -1
	var parsed: Variant = JSON.parse_string(trimmed)
	if not (parsed is Dictionary):
		return -1
	var env: Dictionary = parsed
	var seq_val: Variant = env.get("save_seq", 0)
	if not is_whole_json_number(seq_val):
		return -1
	return int(roundf(float(seq_val)))

func load_godot_state() -> bool:
	var candidates: Array[String] = []
	if OS.has_feature("web"):
		var web_val: Variant = JavaScriptBridge.eval("try { window.localStorage.getItem('%s') || ''; } catch (_e) { ''; }" % GODOT_WEB_STORAGE_KEY, true)
		if web_val is String and not String(web_val).strip_edges().is_empty():
			candidates.append(String(web_val))
	elif FileAccess.file_exists(save_path):
		var file_val := FileAccess.get_file_as_string(save_path)
		if not file_val.strip_edges().is_empty() and not candidates.has(file_val):
			candidates.append(file_val)
	if candidates.is_empty():
		reset_mural_state_to_defaults("fresh")
		return false
	if candidates.size() > 1:
		candidates.sort_custom(func(a: String, b: String) -> bool:
			return extract_candidate_save_seq(a) > extract_candidate_save_seq(b)
		)
	for raw_json in candidates:
		if apply_save_envelope(raw_json):
			return true
	return false

func clear_godot_save() -> void:
	save_seq = 0
	if FileAccess.file_exists(save_path):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(save_path))
	if OS.has_feature("web"):
		JavaScriptBridge.eval("try { window.localStorage.removeItem('%s'); } catch (_e) {}" % GODOT_WEB_STORAGE_KEY, true)
	reset_mural_state_to_defaults("fresh")

func advance_walk(delta: float) -> bool:
	if current_path.is_empty() or delta <= 0.0:
		return false
	var goal_xz: Vector2 = current_path.back()
	if selected_neighbor >= 0:
		goal_xz = neighbor_xz(selected_neighbor)
	elif walking_to_mural:
		goal_xz = mural_stand_xz()
	elif walking_to_speaker:
		goal_xz = speaker_stand_xz()
	elif not walking_to_history_stop.is_empty():
		goal_xz = history_stop_xz(walking_to_history_stop)
	var use_corridor_speed := walking_to_history_stop == "blackhawk" or player_xz().x < -50.0 or goal_xz.x < -50.0
	var speed := WALK_CORRIDOR_SPEED_M_PER_S if use_corridor_speed else WALK_SPEED_M_PER_S
	var remaining := speed * delta
	var replanned := false
	while remaining > 0.0 and not current_path.is_empty():
		var cur := player_xz()
		if selected_neighbor >= 0 and cur.distance_to(goal_xz) <= ARRIVAL_DISTANCE_M:
			finish_neighbor_arrival(selected_neighbor)
			return true
		if walking_to_mural and cur.distance_to(goal_xz) <= ARRIVAL_DISTANCE_M:
			finish_mural_arrival()
			return true
		if walking_to_speaker and cur.distance_to(goal_xz) <= ARRIVAL_DISTANCE_M:
			finish_speaker_arrival()
			return true
		if not walking_to_history_stop.is_empty() and cur.distance_to(goal_xz) <= ARRIVAL_DISTANCE_M:
			finish_history_stop_arrival(walking_to_history_stop)
			return true
		var wp: Vector2 = current_path[0]
		var to_wp := wp - cur
		var d := to_wp.length()
		if d <= 0.08:
			current_path.remove_at(0)
			continue
		var step := minf(remaining, minf(d, 0.20))
		var nxt := cur + to_wp.normalized() * step
		if not is_walkable_point(nxt):
			if not replanned:
				replanned = true
				current_path = find_path(cur, goal_xz)
				if current_path.size() > 1 and current_path[0].distance_to(cur) < 0.20:
					current_path.remove_at(0)
				if not current_path.is_empty():
					continue
			current_path.clear()
			break
		player.position = Vector3(nxt.x, 0.0, nxt.y)
		if player_visual != null and to_wp.length_squared() > 1e-4:
			player_visual.rotation.y = atan2(to_wp.x, to_wp.y)
		remaining -= step
		if selected_neighbor >= 0 and nxt.distance_to(goal_xz) <= ARRIVAL_DISTANCE_M:
			finish_neighbor_arrival(selected_neighbor)
			return true
		if walking_to_mural and nxt.distance_to(goal_xz) <= ARRIVAL_DISTANCE_M:
			finish_mural_arrival()
			return true
		if walking_to_speaker and nxt.distance_to(goal_xz) <= ARRIVAL_DISTANCE_M:
			finish_speaker_arrival()
			return true
		if not walking_to_history_stop.is_empty() and nxt.distance_to(goal_xz) <= ARRIVAL_DISTANCE_M:
			finish_history_stop_arrival(walking_to_history_stop)
			return true
		if nxt.distance_to(wp) <= 0.08:
			current_path.remove_at(0)
	if following_player:
		target = Vector3(player.position.x, 1.0, player.position.z)
		update_camera()
	update_occlusion(false)
	update_route_ribbon(false)
	if selected_neighbor >= 0 or walking_to_mural or walking_to_speaker or not walking_to_history_stop.is_empty():
		var dist_after := player_xz().distance_to(goal_xz)
		if dist_after <= ARRIVAL_DISTANCE_M:
			if selected_neighbor >= 0:
				finish_neighbor_arrival(selected_neighbor)
			elif walking_to_mural:
				finish_mural_arrival()
			elif walking_to_speaker:
				finish_speaker_arrival()
			else:
				finish_history_stop_arrival(walking_to_history_stop)
			return true
		if current_path.is_empty():
			var retry := find_path(player_xz(), goal_xz)
			if retry.size() > 1 and retry[0].distance_to(player_xz()) < 0.20:
				retry.remove_at(0)
			if not retry.is_empty() and retry.back().distance_to(goal_xz) <= ARRIVAL_DISTANCE_M:
				current_path = retry
				update_route_ribbon(true)
			else:
				var dest_name := "Rook's Speaker"
				if selected_neighbor >= 0:
					dest_name = neighbors[selected_neighbor].name
				elif walking_to_mural:
					dest_name = "Portable Mural Board"
				elif not walking_to_history_stop.is_empty():
					var stop_rec := get_history_stop_record(walking_to_history_stop)
					dest_name = String(stop_rec.get("name", stop_rec.get("title", walking_to_history_stop)))
				arrived_neighbor = -1
				walking_to_mural = false
				walking_to_speaker = false
				walking_to_history_stop = ""
				pending_celeste_talk = false
				pending_rook_talk = false
				update_route_ribbon(true)
				info.text = "Route blocked to %s (%.1f m remaining)\nUse WASD/Arrows or tap another street point\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [dest_name, dist_after]
				set_header_details(true, false)
				announce_a11y_status("Route blocked to %s." % dest_name)
	elif current_path.is_empty():
		update_route_ribbon(true)
		update_walking_status()
	return true

func stop_walking() -> void:
	var was_walking := not current_path.is_empty()
	current_path.clear()
	walking_to_mural = false
	walking_to_speaker = false
	walking_to_history_stop = ""
	pending_celeste_talk = false
	pending_rook_talk = false
	update_route_ribbon(true)
	update_walking_status()
	if was_walking:
		update_occlusion(true)
		announce_a11y_status("Walking stopped. Tap a street to choose a route, or Walk & Talk for the next neighbor.")

## One permanent control gives touch players the same route stop as Escape.
func update_walk_control() -> void:
	if walk_control == null:
		return
	var walking := not current_path.is_empty()
	walk_control.text = "Stop Walking" if walking else "Walk & Talk (Next)"
	if uses_compact_activity_controls():
		walk_control.text = ("Stop" if walking else "Walk") if bubble_viewport_size().x < SIDE_HUB_MIN_WIDTH and has_side_panel_dock() else ("Stop Walk" if walking else "Walk / Talk")
	walk_control.tooltip_text = "Stop here without changing progress. Escape also stops." if walking else "Walk to the next neighbor and talk on arrival."

func activate_walk_control() -> void:
	if not current_path.is_empty():
		stop_walking()
	else:
		choose_next_neighbor(1)

func press_walk_control() -> void:
	# A touch press also emits an emulated mouse press. Keep its original intent
	# until release so Stop cannot become Walk/Talk during that same gesture.
	if walk_control_press_handled:
		return
	walk_control_press_handled = true
	activate_walk_control()

func follow_player() -> void:
	in_overview = false
	in_wide_overview = false
	following_player = true
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
		selected = -1
	if view_size > 90.0:
		view_size = 58.0
	target = Vector3(player.position.x, 1.0, player.position.z)
	update_camera()
	update_occlusion(true)
	update_walking_status()

func clear_occlusion() -> void:
	for idx in occluded_buildings:
		if idx >= 0 and idx < meshes.size():
			meshes[idx].material_override = chosen_material if idx == selected else building_materials[idx]
			set_rooftop_details_visible(meshes[idx], true)
	occluded_buildings.clear()
	for w_idx in occluded_wider_buildings:
		if w_idx >= 0 and w_idx < wider_meshes.size():
			wider_meshes[w_idx].material_override = wider_building_materials[w_idx]
			set_rooftop_details_visible(wider_meshes[w_idx], true)
	occluded_wider_buildings.clear()
	for a_idx in occluded_additions:
		if a_idx >= 0 and a_idx < addition_meshes.size():
			addition_meshes[a_idx].material_override = addition_materials[a_idx]
			set_rooftop_details_visible(addition_meshes[a_idx], true)
	occluded_additions.clear()
	last_occlusion_pos = Vector2(INF, INF)
	last_occlusion_neighbor = -2

func get_camera_offset_vec() -> Vector3:
	var base := Vector3(CAMERA_OFFSET.x, CAMERA_OFFSET.y * camera_pitch_scale, CAMERA_OFFSET.z)
	return base.rotated(Vector3.UP, camera_yaw)

func rotate_camera_by_delta(delta_yaw: float, delta_pitch: float = 0.0) -> void:
	in_overview = false
	in_wide_overview = false
	camera_yaw = wrapf(camera_yaw + delta_yaw, -PI, PI)
	camera_pitch_scale = clampf(camera_pitch_scale + delta_pitch, 0.55, 1.65)
	update_camera()
	update_occlusion(true)

func building_record_occludes_point(b: Dictionary, raw_rect: Rect2, focus_xz: Vector2, focus_y: float = 1.0) -> bool:
	var h: float = b.height_m
	if h <= focus_y + 1.0:
		return false
	var max_t := h - focus_y
	var b_rect: Rect2 = raw_rect.grow(CUTAWAY_RADIUS_M)
	var cam_off := get_camera_offset_vec()
	var ray_slope := Vector2(cam_off.x / maxf(cam_off.y, 1.0), cam_off.z / maxf(cam_off.y, 1.0))
	var t := 1.0
	while t <= max_t:
		var ray_pt := focus_xz + ray_slope * t
		if b_rect.has_point(ray_pt):
			for polygon in b.polygons:
				if is_point_in_building_polygon(ray_pt, polygon):
					return true
				for ring in polygon.rings:
					var r_size: int = ring.size()
					for i in range(r_size):
						var p0: Array = ring[i]
						var p1: Array = ring[(i + 1) % r_size]
						if dist_to_segment_2d(ray_pt, Vector2(p0[0], p0[1]), Vector2(p1[0], p1[1])) <= CUTAWAY_RADIUS_M:
							return true
		t += 1.5
	return false

func building_occludes_point(b_idx: int, focus_xz: Vector2, focus_y: float = 1.0) -> bool:
	return building_record_occludes_point(data.buildings[b_idx], building_rects[b_idx], focus_xz, focus_y)

func update_occlusion(force: bool = true) -> void:
	if in_overview or in_wide_overview or selected >= 0:
		clear_occlusion()
		return
	var p_xz := player_xz()
	var occ_tag := selected_neighbor
	if walking_to_mural or arrived_mural:
		occ_tag = 99
	elif walking_to_speaker or arrived_speaker:
		occ_tag = 98
	elif walking_to_history_stop == "comptons" or arrived_history_stop == "comptons":
		occ_tag = 97
	elif walking_to_history_stop == "blackhawk" or arrived_history_stop == "blackhawk":
		occ_tag = 96
	if not force and p_xz.distance_to(last_occlusion_pos) < 0.40 and last_occlusion_neighbor == occ_tag:
		return
	clear_occlusion()
	last_occlusion_pos = p_xz
	last_occlusion_neighbor = occ_tag
	var focus_points: Array[Vector2] = [p_xz]
	if not following_player:
		var framed_xz := Vector2(target.x, target.z)
		if eatery_guide_idx >= 0 and eatery_guide_idx < eatery_counter_points.size() and framed_xz.distance_to(eatery_counter_points[eatery_guide_idx]) < 16.0:
			focus_points.append(eatery_counter_points[eatery_guide_idx])
		if framed_xz.distance_to(Vector2(MUSEUM_HUB_POS.x, MUSEUM_HUB_POS.z)) < 12.0:
			focus_points.append(Vector2(MUSEUM_HUB_POS.x, MUSEUM_HUB_POS.z))
		for s_id in NEIGHBORHOOD_SURPRISE_IDS:
			if surprise_points.has(s_id):
				var sp: Vector2 = surprise_points[s_id]
				if framed_xz.distance_to(sp) < 14.0:
					focus_points.append(sp)
	if selected_neighbor >= 0 and selected_neighbor < neighbors.size():
		focus_points.append(neighbor_xz(selected_neighbor))
	if selected_neighbor == celeste_index or arrived_neighbor == celeste_index or walking_to_mural or arrived_mural:
		focus_points.append(mural_xz())
		focus_points.append(neighbor_xz(celeste_index))
	if selected_neighbor == rook_index or arrived_neighbor == rook_index or walking_to_speaker or arrived_speaker:
		focus_points.append(speaker_xz())
		focus_points.append(neighbor_xz(rook_index))
	if not walking_to_history_stop.is_empty():
		focus_points.append(history_stop_xz(walking_to_history_stop))
		if walking_to_history_stop == "blackhawk":
			focus_points.append(Vector2(-414.0, 56.0))
	elif not arrived_history_stop.is_empty():
		focus_points.append(history_stop_xz(arrived_history_stop))
		if arrived_history_stop == "blackhawk":
			focus_points.append(Vector2(-414.0, 56.0))
	for idx in range(data.buildings.size()):
		for fp in focus_points:
			if building_occludes_point(idx, fp, 1.0):
				occluded_buildings.append(idx)
				meshes[idx].material_override = cutaway_material
				set_rooftop_details_visible(meshes[idx], false)
				break
	var wider_list: Array = data.get("wider_buildings", [])
	for w_idx in range(wider_meshes.size()):
		for fp in focus_points:
			if building_record_occludes_point(wider_list[w_idx], wider_building_rects[w_idx], fp, 1.0):
				occluded_wider_buildings.append(w_idx)
				wider_meshes[w_idx].material_override = cutaway_material
				set_rooftop_details_visible(wider_meshes[w_idx], false)
				break
	for a_idx in range(addition_meshes.size()):
		for fp in focus_points:
			if building_record_occludes_point(lidar_additions[a_idx], addition_rects[a_idx], fp, 1.0):
				occluded_additions.append(a_idx)
				addition_meshes[a_idx].material_override = cutaway_material
				set_rooftop_details_visible(addition_meshes[a_idx], false)
				break

func scene_caption_priority(label: Label3D) -> int:
	if label.has_meta("eatery_index"):
		return (0 if int(label.get_meta("eatery_index")) == eatery_guide_idx else 2) + (1 if label.name == "CounterMenuLabel" else 0)
	return 4

func update_readable_scene_labels() -> void:
	var map_view := in_overview or in_wide_overview
	var wrap_width := minf(320.0, bubble_viewport_size().x - 32.0)
	visible_scene_captions.clear()
	var occupied: Array[Rect2] = []
	if uses_compact_activity_controls():
		occupied.append(player_overlay_rect().grow(4.0))
	if reward_banner != null and reward_banner.is_visible_in_tree():
		occupied.append(reward_banner.get_global_rect().grow(6.0))
	if is_speech_bubble_visible():
		occupied.append(speech_bubble_screen_rect().grow(6.0))
	if talk_prompt_node != null and talk_prompt_node.is_visible_in_tree():
		var talk_rect := talk_prompt_screen_rect()
		var talk_fits := play_area_rect().encloses(talk_rect)
		for reserved in occupied:
			talk_fits = talk_fits and not talk_rect.intersects(reserved)
		talk_prompt_node.visible = talk_fits
		if talk_fits:
			occupied.append(talk_rect.grow(4.0))
	if is_story_card_visible():
		occupied.append(story_card.get_global_rect())
	var ordered := readable_scene_labels.duplicate()
	ordered.sort_custom(func(a: Label3D, b: Label3D) -> bool: return scene_caption_priority(a) < scene_caption_priority(b))
	for label in ordered:
		if not is_instance_valid(label) or not label.is_inside_tree():
			continue
		label.autowrap_mode = TextServer.AUTOWRAP_OFF if map_view else TextServer.AUTOWRAP_WORD_SMART
		label.width = wrap_width
		label.outline_size = 6 if map_view else 10
		var desired_text := String(label.get_meta("full_text"))
		if not map_view:
			desired_text = desired_text.replace(" (Tap / Shift+D)", "").trim_prefix("[*] ")
			if label.name == "MuseumHubLabel":
				desired_text = "Tenderloin Museum\n398 Eddy · Time-Portal"
		if label.text != desired_text:
			label.text = desired_text
		if map_view:
			label.pixel_size = float(label.get_meta("map_pixel_size"))
			label.visible = true
			continue
		label.pixel_size = screen_constant_scale(1.0) / maxf(label.global_basis.get_scale().y, 0.001)
		var label_xz := Vector2(label.global_position.x, label.global_position.z)
		label.visible = label_xz.distance_to(Vector2(target.x, target.z)) <= 55.0
		var measure_key := "%s|%s|%d" % [label.text, wrap_width, label.font_size]
		if label.get_meta("caption_measure_key", "") != measure_key:
			label.set_meta("caption_measure_key", measure_key)
			label.set_meta("caption_size", ThemeDB.fallback_font.get_multiline_string_size(label.text, HORIZONTAL_ALIGNMENT_CENTER, wrap_width, label.font_size) + Vector2(20.0, 20.0))
		var caption_size: Vector2 = label.get_meta("caption_size")
		var caption_center := camera.unproject_position(label.global_position)
		var rect := Rect2(caption_center - caption_size * 0.5, caption_size)
		label.visible = label.visible and not camera.is_position_behind(label.global_position) and play_area_rect().encloses(rect)
		if label.name == "TimePortalLabel":
			label.visible = false # Combined with the hub caption in the close view.
		if label.has_meta("neighbor_index"):
			var neighbor_i := int(label.get_meta("neighbor_index"))
			if talk_prompt_node != null and talk_prompt_node.visible and talk_prompt_neighbor == neighbor_i:
				label.visible = false # The larger Talk prompt already includes this name.
			if speech_bubble_anchor == String(label.get_meta("neighbor_id")):
				label.visible = false
		for reserved in occupied:
			if rect.intersects(reserved):
				label.visible = false
				break
		if label.is_visible_in_tree():
			occupied.append(rect.grow(4.0))
			visible_scene_captions.append({"rect": rect, "id": String(label.get_path()), "text": label.text, "eatery_index": int(label.get_meta("eatery_index", -1))})
	update_guide_arrow() # Place objective text after the current captions and Talk prompt.

func _process(delta: float) -> void:
	if player_nameplate != null and camera != null:
		player_nameplate.pixel_size = screen_constant_scale(1.0) / player_visual.scale.y
		player_nameplate.visible = not in_overview and not in_wide_overview
	poll_web_audio()
	if music_playing:
		advance_music_clock(delta)
	update_people_animation(delta)
	update_tree_sway(delta)
	update_eatery_animation(delta)
	update_landmark_tour_completion()
	update_conversation_ui(delta)
	update_celebration_burst(delta)
	update_speech_bubble(delta)
	if reward_banner_timer > 0.0:
		layout_reward_banner() # Speech may have opened or released Info this frame.
	update_readable_scene_labels()
	flush_web_a11y_status()

func _physics_process(delta: float) -> void:
	var shift_held := Input.is_key_pressed(KEY_SHIFT) or Input.is_physical_key_pressed(KEY_SHIFT)
	if shift_held and get_viewport().gui_get_focus_owner() == null:
		var yaw_dir := 0.0
		var pitch_dir := 0.0
		if Input.is_key_pressed(KEY_LEFT):
			yaw_dir -= 1.0
		if Input.is_key_pressed(KEY_RIGHT):
			yaw_dir += 1.0
		if Input.is_key_pressed(KEY_UP):
			pitch_dir += 1.0
		if Input.is_key_pressed(KEY_DOWN):
			pitch_dir -= 1.0
		if absf(yaw_dir) > 0.0 or absf(pitch_dir) > 0.0:
			rotate_camera_by_delta(yaw_dir * delta * 1.65, pitch_dir * delta * 0.75)
			return
	var input_vec := Vector2.ZERO
	if not shift_held:
		if Input.is_key_pressed(KEY_D) or Input.is_physical_key_pressed(KEY_D):
			input_vec.x += 1.0
		if Input.is_key_pressed(KEY_A) or Input.is_physical_key_pressed(KEY_A):
			input_vec.x -= 1.0
		if Input.is_key_pressed(KEY_S) or Input.is_physical_key_pressed(KEY_S):
			input_vec.y += 1.0
		if Input.is_key_pressed(KEY_W) or Input.is_physical_key_pressed(KEY_W):
			input_vec.y -= 1.0
	if get_viewport().gui_get_focus_owner() == null and not shift_held:
		if Input.is_key_pressed(KEY_RIGHT):
			input_vec.x += 1.0
		if Input.is_key_pressed(KEY_LEFT):
			input_vec.x -= 1.0
		if Input.is_key_pressed(KEY_DOWN):
			input_vec.y += 1.0
		if Input.is_key_pressed(KEY_UP):
			input_vec.y -= 1.0
	if input_vec.length_squared() > 0.0:
		if get_viewport().gui_get_focus_owner() != null:
			get_viewport().gui_release_focus()
		if absf(camera_yaw) > 1e-4:
			input_vec = input_vec.rotated(-camera_yaw)
		walk_step(input_vec, delta)
		var p_now := player_xz()
		if last_proximity_neighbor >= 0 and last_proximity_neighbor < neighbors.size():
			if p_now.distance_to(neighbor_xz(last_proximity_neighbor)) > ARRIVAL_DISTANCE_M + 0.75:
				last_proximity_neighbor = -1
		for n_i in range(neighbors.size()):
			if p_now.distance_to(neighbor_xz(n_i)) <= ARRIVAL_DISTANCE_M:
				if last_proximity_neighbor != n_i:
					last_proximity_neighbor = n_i
					selected_neighbor = n_i
					finish_neighbor_arrival(n_i)
				break
	elif not current_path.is_empty():
		advance_walk(delta * (2.2 if OS.has_feature("web") else 1.0))

func is_screen_point_in_ui(screen_pos: Vector2) -> bool:
	if reward_banner != null and reward_banner.is_visible_in_tree() and reward_banner.get_global_rect().has_point(screen_pos):
		return true
	if is_speech_bubble_visible() and speech_bubble_screen_rect().has_point(screen_pos):
		return true
	if header_panel and header_panel.get_global_rect().has_point(screen_pos):
		return true
	if is_story_card_visible() and story_card.get_global_rect().has_point(screen_pos):
		return true
	if mural_panel and mural_panel.visible and mural_panel.get_global_rect().has_point(screen_pos):
		return true
	if music_panel and music_panel.visible and music_panel.get_global_rect().has_point(screen_pos):
		return true
	if block_panel and block_panel.visible and block_panel.get_global_rect().has_point(screen_pos):
		return true
	if controls and controls.get_global_rect().has_point(screen_pos):
		return true
	return false

func screen_to_ground_xz(screen_pos: Vector2) -> Vector2:
	var origin := camera.project_ray_origin(screen_pos)
	var normal := camera.project_ray_normal(screen_pos)
	if absf(normal.y) < 1e-6:
		return Vector2(target.x, target.z)
	var t := -origin.y / normal.y
	var hit := origin + normal * t
	return Vector2(hit.x, hit.z)

func neighbor_screen_distance(index: int, screen_pos: Vector2) -> float:
	var base_pos: Vector3 = neighbors[index].pos
	var best_d := INF
	for h_off in [0.9, 2.3, 4.1]:
		var d := camera.unproject_position(base_pos + Vector3(0.0, h_off, 0.0)).distance_to(screen_pos)
		if d < best_d:
			best_d = d
	return best_d

func surprise_has_guide_marker(sp: Vector2) -> bool:
	return guide_marker != null and guide_marker.visible and Vector2(guide_marker_target.x, guide_marker_target.z).distance_to(sp) < 0.5

func surprise_screen_distance(sp: Vector2, screen_pos: Vector2, include_marker: bool = false) -> float:
	var best_d := INF
	for h_off in [0.8, 1.6, 2.6]:
		var d := camera.unproject_position(Vector3(sp.x, h_off, sp.y)).distance_to(screen_pos)
		if d < best_d:
			best_d = d
	if include_marker:
		for m_y in [GUIDE_MARKER_LIFT_LOW, guide_marker.global_position.y + 0.5 * guide_marker.scale.y]:
			var md := camera.unproject_position(Vector3(sp.x, m_y, sp.y)).distance_to(screen_pos)
			if md < best_d:
				best_d = md
	return best_d

func handle_scene_tap(screen_pos: Vector2) -> bool:
	if is_screen_point_in_ui(screen_pos):
		return false
	if startup_story_pending:
		continue_story() # First street tap accepts and frames; routing uses a subsequent tap in the new view.
		return true
	hide_story_card()
	var ground_xz := screen_to_ground_xz(screen_pos)
	var obj := current_objective()
	if obj.has("tour_id") and guide_marker != null and guide_marker.visible:
		var marker_pos := guide_marker.global_position + Vector3.UP * 0.5 * guide_marker.scale.y
		var marker_hit: Variant = Plane(Vector3.UP, marker_pos.y).intersects_ray(camera.project_ray_origin(screen_pos), camera.project_ray_normal(screen_pos))
		if not camera.is_position_behind(marker_pos) and camera.unproject_position(marker_pos).distance_to(screen_pos) <= 28.0 and marker_hit is Vector3 and marker_hit.distance_to(marker_pos) <= 9.5:
			return visit_next_landmark()
	update_readable_scene_labels() # Hit targets follow the current camera and visibility.
	for caption in visible_scene_captions:
		if int(caption.eatery_index) >= 0 and (caption.rect as Rect2).has_point(screen_pos):
			return activate_eatery(int(caption.eatery_index))
	var best_idx := -1
	var best_screen_d := INF
	for i in range(neighbors.size()):
		var screen_d := neighbor_screen_distance(i, screen_pos)
		var world_d := neighbor_xz(i).distance_to(ground_xz)
		if (screen_d <= 48.0 and world_d <= 14.0) or world_d <= 4.5:
			if screen_d < best_screen_d:
				best_screen_d = screen_d
				best_idx = i
	var m_screen := camera.unproject_position(MURAL_POS + Vector3(0.0, 1.4, 0.0))
	var m_screen_d := m_screen.distance_to(screen_pos)
	var m_world_d := mural_xz().distance_to(ground_xz)
	if ((m_screen_d <= 38.0 and m_world_d <= 8.5) or m_world_d <= 3.6) and m_screen_d < best_screen_d:
		return walk_to_mural()
	var s_screen := camera.unproject_position(ROOK_SPEAKER_POS + Vector3(0.0, 0.8, 0.0))
	var s_screen_d := s_screen.distance_to(screen_pos)
	var s_world_d := speaker_xz().distance_to(ground_xz)
	if ((s_screen_d <= 36.0 and s_world_d <= 8.5) or s_world_d <= 3.2) and s_screen_d < best_screen_d:
		return walk_to_speaker()
	var c_screen := camera.unproject_position(history_stop_pos_3d("comptons") + Vector3(0.0, 1.3, 0.0))
	var c_screen_d := c_screen.distance_to(screen_pos)
	var c_world_d := comptons_xz().distance_to(ground_xz)
	if ((c_screen_d <= 34.0 and c_world_d <= 8.5) or c_world_d <= 3.0) and c_screen_d < best_screen_d:
		return walk_to_history_stop("comptons")
	var bh_screen := camera.unproject_position(history_stop_pos_3d("blackhawk") + Vector3(0.0, 1.3, 0.0))
	var bh_screen_d := bh_screen.distance_to(screen_pos)
	var bh_world_d := blackhawk_xz().distance_to(ground_xz)
	if ((bh_screen_d <= 36.0 and bh_world_d <= 8.5) or bh_world_d <= 3.5) and bh_screen_d < best_screen_d:
		return walk_to_history_stop("blackhawk")
	if not in_overview and not in_wide_overview:
		var best_surp_id := ""
		var best_surp_screen_d := best_screen_d
		for s_id in NEIGHBORHOOD_SURPRISE_IDS:
			if surprise_points.has(s_id):
				var sp: Vector2 = surprise_points[s_id]
				var has_marker := surprise_has_guide_marker(sp)
				var surp_screen_d := surprise_screen_distance(sp, screen_pos, has_marker)
				var surp_world_d := sp.distance_to(ground_xz)
				var max_world_d := 9.5 if has_marker else 5.5
				if ((surp_screen_d <= 32.0 and surp_world_d <= max_world_d) or surp_world_d <= 2.2) and surp_screen_d < best_surp_screen_d:
					best_surp_screen_d = surp_screen_d
					best_surp_id = s_id
		if not best_surp_id.is_empty():
			return inspect_neighborhood_surprise(best_surp_id)
	var turk_ee_screen := camera.unproject_position(Vector3(SO_WHAT_AWNING_XZ.x, 3.6, SO_WHAT_AWNING_XZ.y))
	var leav_ee_screen := camera.unproject_position(Vector3(-290.8, 24.6, 99.4))
	if turk_ee_screen.distance_to(screen_pos) <= 28.0 or leav_ee_screen.distance_to(screen_pos) <= 28.0:
		return inspect_so_what_easter_egg()
	var museum_screen := camera.unproject_position(MUSEUM_HUB_POS + Vector3(0.0, 2.2, 0.0))
	if museum_screen.distance_to(screen_pos) <= 28.0:
		return inspect_tenderloin_museum_hub()
	var park_screen := camera.unproject_position(Vector3(BOEDDEKER_PARK_ENTRANCE.x, 3.6, BOEDDEKER_PARK_ENTRANCE.y))
	if park_screen.distance_to(screen_pos) <= 26.0:
		return inspect_boeddeker_park()
	for e_i in range(NEIGHBORHOOD_EATERIES.size()):
		var e_pos: Vector3 = NEIGHBORHOOD_EATERIES[e_i].get("pos", Vector3.ZERO)
		var e_screen := camera.unproject_position(e_pos + Vector3(0.0, 2.2, 0.0))
		var counter_open := e_i < eatery_counter_nodes.size() and eatery_counter_nodes[e_i].visible
		var is_tour_counter := String(obj.get("tour_id", "")) == "eatery:%d" % e_i
		var counter_screen_d := INF
		if counter_open or is_tour_counter:
			var cp := eatery_counter_points[e_i]
			counter_screen_d = camera.unproject_position(Vector3(cp.x, 1.3, cp.y)).distance_to(screen_pos)
		if e_screen.distance_to(screen_pos) <= 24.0 or counter_screen_d <= 30.0:
			return activate_eatery(e_i)
	if best_idx >= 0:
		if arrived_neighbor == best_idx and player_xz().distance_to(neighbor_xz(best_idx)) <= ARRIVAL_DISTANCE_M + 0.5:
			if best_idx == celeste_index:
				talk_with_celeste()
				return true
			elif best_idx == rook_index:
				check_sound_with_rook()
				return true
			else:
				talk_with_neighbor(best_idx)
				return true
		return walk_to_neighbor(best_idx)
	return walk_to_point(ground_xz)

func activate_eatery(index: int) -> bool:
	if String(current_objective().get("tour_id", "")) == "eatery:%d" % index:
		return visit_next_landmark()
	if eatery_counter_nodes[index].visible and index == eatery_guide_idx:
		return eatery_counter_interact(index)
	return cycle_eatery_guide(index)

func pan_camera_by_screen_delta(delta_px: Vector2) -> void:
	in_overview = false
	in_wide_overview = false
	following_player = false
	var ppm := (camera.unproject_position(target + camera.global_basis.y) - camera.unproject_position(target)).length()
	if ppm <= 1e-5:
		return
	target -= camera.global_basis.x * (delta_px.x / ppm) - camera.global_basis.y * (delta_px.y / ppm)
	target.x = clampf(target.x, walk_bounds.position.x, walk_bounds.end.x)
	target.z = clampf(target.z, walk_bounds.position.y, walk_bounds.end.y)
	update_camera()

func _input(event: InputEvent) -> void:
	# Observe real input before Controls consume it; never replay cues from loading.
	var key_activation: bool = event is InputEventKey and event.pressed and not event.echo and event.keycode not in [KEY_ESCAPE, KEY_SHIFT, KEY_CTRL, KEY_ALT, KEY_META]
	var mouse_activation: bool = event is InputEventMouseButton and event.pressed and event.button_index in [MOUSE_BUTTON_LEFT, MOUSE_BUTTON_RIGHT, MOUSE_BUTTON_MIDDLE]
	if key_activation or mouse_activation or (event is InputEventScreenTouch and not event.pressed):
		reward_audio_unlocked = true
	if event is InputEventKey and event.pressed and is_story_card_visible():
		var reading_key: Key = event.keycode if event.keycode != KEY_NONE else event.physical_keycode
		var page_key := reading_key in [KEY_PAGEUP, KEY_PAGEDOWN, KEY_HOME, KEY_END]
		var page_target := story_reader_has_focus() or story_continue_btn.has_focus() or get_viewport().gui_get_focus_owner() == null
		if (page_key and page_target) or (story_reader_has_focus() and reading_key in [KEY_UP, KEY_DOWN, KEY_LEFT, KEY_RIGHT]):
			if page_key and not story_reader_has_focus():
				story_body_label.grab_focus()
			var reading_scroll := story_body_label.get_v_scroll_bar()
			var line := story_body_label.get_theme_font("normal_font").get_height(story_body_label.get_theme_font_size("normal_font_size"))
			match reading_key:
				KEY_UP: reading_scroll.value -= line
				KEY_DOWN: reading_scroll.value += line
				KEY_PAGEUP: reading_scroll.value -= reading_scroll.page * 0.9
				KEY_PAGEDOWN: reading_scroll.value += reading_scroll.page * 0.9
				KEY_HOME: reading_scroll.value = 0.0
				KEY_END: reading_scroll.value = reading_scroll.max_value
			get_viewport().set_input_as_handled()
			return
	if event is InputEventKey and event.pressed and startup_story_pending and event.keycode in [KEY_W, KEY_A, KEY_S, KEY_D, KEY_UP, KEY_DOWN, KEY_LEFT, KEY_RIGHT] and not (story_reader_has_focus() and event.keycode in [KEY_UP, KEY_DOWN, KEY_LEFT, KEY_RIGHT]):
		continue_story()

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		var k: Key = event.keycode if event.keycode != KEY_NONE else event.physical_keycode
		if is_story_card_visible() and not (k in [KEY_SHIFT, KEY_CTRL, KEY_ALT, KEY_META]):
			if k == KEY_ESCAPE or k == KEY_ENTER or k == KEY_KP_ENTER or k == KEY_SPACE:
				continue_story(k != KEY_ESCAPE)
				return
			if startup_story_pending and k in [KEY_W, KEY_A, KEY_S, KEY_D, KEY_UP, KEY_DOWN, KEY_LEFT, KEY_RIGHT]:
				continue_story()
			else:
				hide_story_card()
		match k:
			KEY_1, KEY_KP_1:
				if arrived_neighbor == 0:
					talk_with_neighbor(0)
				else:
					walk_to_neighbor(0)
			KEY_2, KEY_KP_2:
				if arrived_neighbor == 1:
					talk_with_celeste()
				else:
					walk_to_neighbor(1)
			KEY_3, KEY_KP_3:
				if arrived_neighbor == 2:
					check_sound_with_rook()
				else:
					walk_to_neighbor(2)
			KEY_4, KEY_KP_4:
				if arrived_neighbor == 3:
					talk_with_neighbor(3)
				else:
					walk_to_neighbor(3)
			KEY_5, KEY_KP_5:
				if arrived_neighbor == 4:
					talk_with_neighbor(4)
				else:
					walk_to_neighbor(4)
			KEY_6, KEY_KP_6:
				if can_interact_with_mural():
					activate_or_advance_motif("sun")
			KEY_7, KEY_KP_7:
				if can_interact_with_mural():
					activate_or_advance_motif("wave")
			KEY_8, KEY_KP_8:
				if can_interact_with_mural():
					activate_or_advance_motif("rise")
			KEY_9, KEY_KP_9:
				if can_interact_with_mural():
					move_active_motif(1, 0)
			KEY_0, KEY_KP_0:
				if can_interact_with_mural():
					clear_mural_board()
			KEY_M:
				if event.shift_pressed:
					inspect_tenderloin_museum_hub()
				else:
					walk_to_mural()
			KEY_E:
				if event.shift_pressed:
					cycle_eatery_guide()
				elif arrived_neighbor == celeste_index or arrived_mural:
					talk_with_celeste()
				elif not current_path.is_empty() and (selected_neighbor == celeste_index or walking_to_mural):
					pending_celeste_talk = true
				else:
					if walk_to_neighbor(celeste_index):
						if arrived_neighbor == celeste_index:
							talk_with_celeste()
						else:
							pending_celeste_talk = true
			KEY_T:
				if arrived_neighbor == celeste_index or arrived_mural:
					talk_with_celeste()
				elif arrived_neighbor == rook_index or arrived_speaker:
					check_sound_with_rook()
				elif arrived_neighbor >= 0 and arrived_neighbor < neighbors.size():
					talk_with_neighbor(arrived_neighbor)
				elif not current_path.is_empty() and (selected_neighbor == celeste_index or walking_to_mural):
					pending_celeste_talk = true
				elif talk_to_nearby_neighbor(8.0):
					pass
				else:
					if walk_to_neighbor(celeste_index):
						if arrived_neighbor == celeste_index:
							talk_with_celeste()
						else:
							pending_celeste_talk = true
			KEY_R:
				request_rook_soundcheck()
			KEY_K:
				show_music_panel(true)
				toggle_music_playback()
			KEY_V:
				show_music_panel(true)
				cycle_music_volume()
			KEY_U:
				show_music_panel(true)
				use_synth_sketch()
			KEY_G:
				toggle_block_panel()
			KEY_O:
				show_block_panel(true)
				open_block_gathering()
			KEY_Y:
				if event.shift_pressed:
					show_block_panel(true)
					var kp_st := String(keepsake_photo.get("status", "unasked"))
					if kp_st == "taken":
						export_keepsake_svg()
					elif not epilogue_packing and kp_st == "unasked":
						skip_keepsake_photo()
					else:
						var no_kp_msg := "No keepsake photo to export."
						info.text = "%s\nTake the M1 Keepsake Photo (Y) when the block gathering opens to export a keepsake SVG\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % no_kp_msg
						announce_a11y_status(no_kp_msg)
				else:
					advance_epilogue_step()
			KEY_Z:
				if event.shift_pressed:
					cycle_programme_or_hosting_choice()
				else:
					advance_programme_and_hosting_step()
			KEY_Q:
				if event.shift_pressed:
					cycle_civic_choice()
				else:
					advance_civic_step()
			KEY_PERIOD:
				if event.shift_pressed:
					cycle_film_choice_or_frame()
				else:
					advance_film_step()
			KEY_SLASH:
				if event.shift_pressed and voices_enabled:
					if voices_status == "error":
						retry_voices_load()
					elif voices_status == "ready":
						present_voices_summary()
				else:
					toggle_voices_enabled()
			KEY_I:
				import_browser_save_from_web_storage()
			KEY_J:
				walk_to_or_read_history_stop("comptons")
			KEY_H:
				if event.shift_pressed:
					inspect_so_what_easter_egg()
				else:
					walk_to_or_read_history_stop("blackhawk")
			KEY_C:
				toggle_district_boundary()
			KEY_D:
				if event.shift_pressed:
					cycle_neighborhood_surprise()
			KEY_L:
				if event.shift_pressed:
					toggle_evening_lights()
				else:
					wide_overview()
			KEY_P:
				if can_interact_with_mural():
					cycle_mural_palette()
			KEY_N, KEY_BRACKETRIGHT: choose_next_neighbor(1)
			KEY_B, KEY_BRACKETLEFT: choose_next_neighbor(-1)
			KEY_F: frame_player_for_walking()
			KEY_ESCAPE, KEY_X:
				var any_panel := (block_panel != null and block_panel.visible) or (mural_panel != null and mural_panel.visible) or (music_panel != null and music_panel.visible)
				if current_path.is_empty() and any_panel:
					end_conversation()
				else:
					stop_walking()
	elif event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed:
			if not is_screen_point_in_ui(event.position):
				zoom(0.88)
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed:
			if not is_screen_point_in_ui(event.position):
				zoom(1.14)
		elif event.button_index == MOUSE_BUTTON_RIGHT or event.button_index == MOUSE_BUTTON_MIDDLE:
			if event.pressed:
				if not is_screen_point_in_ui(event.position):
					orbit_dragging = true
					orbit_last_pos = event.position
			else:
				orbit_dragging = false
		elif event.button_index == MOUSE_BUTTON_LEFT:
			# Godot emulates MouseButton/MouseMotion from touch by default; handling once avoids double firing.
			if event.pressed:
				if not is_screen_point_in_ui(event.position):
					if event.shift_pressed or event.alt_pressed or event.ctrl_pressed:
						orbit_dragging = true
						orbit_last_pos = event.position
					else:
						pointer_active = true
						pointer_dragging = false
						pointer_down_pos = event.position
						pointer_last_pos = event.position
			else:
				orbit_dragging = false
				if pointer_active:
					var was_drag := pointer_dragging
					pointer_active = false
					pointer_dragging = false
					if not was_drag:
						handle_scene_tap(event.position)
	elif event is InputEventMouseMotion:
		if orbit_dragging:
			var d_orb: Vector2 = event.position - orbit_last_pos
			orbit_last_pos = event.position
			rotate_camera_by_delta(-d_orb.x * 0.0085, d_orb.y * 0.0035)
		elif pointer_active:
			if event.position.distance_to(pointer_down_pos) > 8.0:
				pointer_dragging = true
			if pointer_dragging:
				pan_camera_by_screen_delta(event.position - pointer_last_pos)
			pointer_last_pos = event.position

func update_camera() -> void:
	camera.size = view_size
	var offset_scale := 2.2 if (in_wide_overview or view_size > 300.0) else 1.0
	camera.position = target + get_camera_offset_vec() * offset_scale
	camera.look_at(target)
	camera.force_update_transform()
	# The menu should leave the followed character in the remaining scene area.
	# Keep inspection/panned views, heading and zoom under the player's control.
	if following_player and block_panel != null and block_panel.visible and block_panel_mode == "hub":
		var focus := player.position + Vector3.UP
		var ppm := (camera.unproject_position(target + camera.global_basis.y) - camera.unproject_position(target)).length()
		if ppm > 1e-5:
			var delta := play_area_rect().get_center() - camera.unproject_position(focus)
			target -= camera.global_basis.x * delta.x / ppm - camera.global_basis.y * delta.y / ppm
			camera.position = target + get_camera_offset_vec() * offset_scale
			camera.look_at(target)
			camera.force_update_transform()

func choose_next(direction: int) -> void:
	in_overview = false
	in_wide_overview = false
	following_player = false
	selected_neighbor = -1
	arrived_neighbor = -1
	walking_to_mural = false
	arrived_mural = false
	pending_celeste_talk = false
	walking_to_speaker = false
	arrived_speaker = false
	pending_rook_talk = false
	walking_to_history_stop = ""
	arrived_history_stop = ""
	show_mural_panel(false)
	show_music_panel(false)
	show_block_panel(false)
	current_path.clear()
	update_route_ribbon(true)
	clear_occlusion()
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
		selected = posmod(selected + direction, data.buildings.size())
	else:
		selected = 0 if direction > 0 else data.buildings.size() - 1
	meshes[selected].material_override = chosen_material
	var building: Dictionary = data.buildings[selected]
	var center := Vector3.ZERO
	var vertices: Array = building.polygons[0].rings[0]
	for vertex in vertices:
		center += point(vertex, 0)
	target = center / vertices.size() + Vector3.UP * building.height_m * 0.3
	view_size = 100
	var facade_line := "Flat terrain; façades and current changes unverified"
	var s_rec: Variant = field_survey_overrides.get(String(building.id), null)
	if s_rec is Dictionary:
		var s_tags: Array = s_rec.get("tags", [])
		facade_line = "Field survey (%s): %s" % [String(s_rec.get("source", "Field Guide")), ", ".join(PackedStringArray(s_tags)) if not s_tags.is_empty() else "surveyed colors"]
	info.text = "%s  •  median height %.2f m\nCity: 2010 survey / PDDL · %s\nStreets © OpenStreetMap contributors / ODbL\n%s" % [building.id, building.height_m, lidar_summary_line(String(building.id), float(building.height_m)), facade_line]
	update_camera()
	announce_a11y_status("Building %s selected, median height %.2f meters." % [building.id, building.height_m])

## One plain line comparing a 2010 footprint with the 2023 LiDAR, or naming the building that replaced it.
func lidar_summary_line(b_id: String, city_h: float) -> String:
	if lidar_superseded.has(b_id):
		var by := lidar_addition(String(lidar_superseded[b_id].by))
		var label := String(by.get("name", "")) if String(by.get("name", "")) != "" else "a newer building"
		return "Replaced: 2023 LiDAR and OpenStreetMap show %s (%s), %.0f m tall" % [label, String(by.get("address", "")), float(by.get("height_m", 0.0))]
	var rec := lidar_record(b_id)
	if rec.is_empty():
		return "no 2023 LiDAR roof yet"
	if bool(rec.get("too_small", false)):
		return "too small for a 2023 LiDAR height check"
	var lidar_med := float(rec.get("median_m", city_h))
	if absf(lidar_med - city_h) > 5.0:
		return "2023 LiDAR median roof %.1f m (%s than in 2010)" % [lidar_med, "taller" if lidar_med > city_h else "lower"]
	var raised: Array = rec.get("masses", [])
	if raised.is_empty():
		return "2023 LiDAR agrees (median %.1f m)" % lidar_med
	return "2023 LiDAR: %d raised roof part%s, up to %.1f m" % [raised.size(), "" if raised.size() == 1 else "s", float(raised[raised.size() - 1].h)]

func overview(announce_view := true) -> void:
	in_overview = true
	hide_speech_bubble()
	hide_story_card()
	if reward_banner != null:
		reward_banner.visible = false
	reward_banner_timer = 0.0
	if celebration_burst_node != null:
		celebration_burst_node.visible = false
	celebration_burst_timer = 0.0
	talk_partner = -1
	block_panel_mode = "hub"
	in_wide_overview = false
	following_player = false
	camera_yaw = 0.0
	camera_pitch_scale = 1.0
	selected_neighbor = -1
	arrived_neighbor = -1
	walking_to_mural = false
	arrived_mural = false
	pending_celeste_talk = false
	walking_to_speaker = false
	arrived_speaker = false
	pending_rook_talk = false
	walking_to_history_stop = ""
	arrived_history_stop = ""
	show_mural_panel(false)
	show_music_panel(false)
	show_block_panel(false)
	current_path.clear()
	update_route_ribbon(true)
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
	selected = -1
	clear_occlusion()
	info.text = overview_text()
	# Fit full records, including geometry beyond the extraction box, between UI.
	var viewport_size := get_viewport().get_visible_rect().size
	var header: Control = info.get_parent().get_parent()
	var top := header.get_global_rect().end.y + 12
	var bottom := controls.get_global_rect().position.y - 12
	var available := Rect2(12, top, maxf(viewport_size.x - 24, 1), maxf(bottom - top, 1))
	target = Vector3(65, 0, -12)
	view_size = 250
	update_camera()
	var bounds := projected_bounds()
	view_size *= maxf(bounds.size.x / available.size.x, bounds.size.y / available.size.y) * 1.06
	overview_size = view_size
	update_camera()
	bounds = projected_bounds()
	var pixels_per_metre := (camera.unproject_position(target + camera.global_basis.y) - camera.unproject_position(target)).length()
	var offset := bounds.get_center() - available.get_center()
	target += camera.global_basis.x * offset.x / pixels_per_metre - camera.global_basis.y * offset.y / pixels_per_metre
	update_camera()
	if announce_view:
		announce_a11y_status("Overview: %d city footprints." % data.buildings.size())

func wide_overview(announce_view := true) -> void:
	in_overview = false
	in_wide_overview = true
	hide_speech_bubble()
	hide_story_card()
	talk_partner = -1
	block_panel_mode = "hub"
	last_panel_dialogue = ""
	if reward_banner != null:
		reward_banner.visible = false
	reward_banner_timer = 0.0
	if celebration_burst_node != null:
		celebration_burst_node.visible = false
	celebration_burst_timer = 0.0
	following_player = false
	camera_yaw = 0.0
	camera_pitch_scale = 1.0
	selected_neighbor = -1
	arrived_neighbor = -1
	walking_to_mural = false
	arrived_mural = false
	pending_celeste_talk = false
	walking_to_speaker = false
	arrived_speaker = false
	pending_rook_talk = false
	walking_to_history_stop = ""
	arrived_history_stop = ""
	show_mural_panel(false)
	show_music_panel(false)
	show_block_panel(false)
	current_path.clear()
	update_route_ribbon(true)
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
	selected = -1
	clear_occlusion()
	info.text = wide_overview_text()
	var viewport_size := get_viewport().get_visible_rect().size
	var header: Control = info.get_parent().get_parent()
	var top := header.get_global_rect().end.y + 12
	var bottom := controls.get_global_rect().position.y - 12
	var available := Rect2(12, top, maxf(viewport_size.x - 24, 1), maxf(bottom - top, 1))
	target = Vector3(-130, 0, 15)
	view_size = 560
	update_camera()
	var bounds := projected_wider_bounds()
	view_size *= maxf(bounds.size.x / available.size.x, bounds.size.y / available.size.y) * 1.06
	update_camera()
	bounds = projected_wider_bounds()
	var pixels_per_metre := (camera.unproject_position(target + camera.global_basis.y) - camera.unproject_position(target)).length()
	var offset := bounds.get_center() - available.get_center()
	target += camera.global_basis.x * offset.x / pixels_per_metre - camera.global_basis.y * offset.y / pixels_per_metre
	update_camera()
	if announce_view:
		announce_a11y_status("Wider Tenderloin overview: %d city footprints across 7 streets; Transgender Cultural District boundary %s." % [all_buildings.size(), "shown" if district_boundary_visible else "hidden"])

func projected_bounds() -> Rect2:
	var bounds := Rect2()
	var first := true
	for building in data.buildings:
		for polygon in building.polygons:
			for vertex in polygon.vertices:
				for h in [0.0, building.height_m]:
					var screen := camera.unproject_position(point(vertex, h))
					if first:
						bounds = Rect2(screen, Vector2.ZERO)
						first = false
					else:
						bounds = bounds.expand(screen)
	return bounds

func projected_wider_bounds() -> Rect2:
	var bounds := Rect2()
	var first := true
	for building in all_buildings:
		for polygon in building.polygons:
			for vertex in polygon.vertices:
				for h in [0.0, building.height_m]:
					var screen := camera.unproject_position(point(vertex, h))
					if first:
						bounds = Rect2(screen, Vector2.ZERO)
						first = false
					else:
						bounds = bounds.expand(screen)
	return bounds

func zoom(factor: float) -> void:
	in_overview = false
	in_wide_overview = false
	view_size = clampf(view_size * factor, 24, maxf(900, overview_size * 2.5))
	update_camera()
	update_occlusion(true)

func overview_text() -> String:
	return "Tap a neighbor to walk over and talk · T talks · Esc says goodbye\nWASD/arrows walk · drag pans · right-drag rotates · scroll zooms · G: all block actions\n%d city footprints · 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % data.buildings.size()

func wide_overview_text() -> String:
	var dist_state := "Shown" if district_boundary_visible else "Hidden"
	return "%d Tenderloin footprints (%d opening + %d wider) · 7 OSM streets\nRight-drag: Rotate 3D · District (%s, C) · Compton's (J) · Black Hawk (H)\nCity 2010 survey & 5xmc-5bjj (2017) / PDDL · Streets © OpenStreetMap / ODbL" % [all_buildings.size(), data.buildings.size(), wider_meshes.size(), dist_state]

func refit_after_layout() -> void:
	layout_refit_generation += 1
	var generation := layout_refit_generation
	layout_refit_pending = true
	await get_tree().process_frame
	await get_tree().process_frame
	if generation != layout_refit_generation:
		return
	var card_up := is_story_card_visible()
	var pending := startup_story_pending
	var reading_card := card_up and story_reader_has_focus()
	if in_overview:
		overview(not card_up)
	elif in_wide_overview:
		wide_overview(not card_up)
	if card_up:
		story_card.visible = true
		startup_story_pending = pending
		update_music_ui()
		layout_story_card()
		(story_body_label if reading_card else story_continue_btn).grab_focus()
	layout_refit_pending = false
	sync_web_a11y_status()

func show_mural_panel(visible_flag: bool) -> void:
	if not visible_flag and panel_frame_control == mural_panel:
		panel_frame_control = null
	var was_vis := mural_panel != null and mural_panel.visible
	if visible_flag:
		talk_partner = -1
		if not was_vis:
			last_panel_dialogue = ""
		if music_panel != null:
			music_panel.visible = false
		if block_panel != null:
			block_panel.visible = false
	if mural_panel != null:
		mural_panel.visible = visible_flag
		if visible_flag:
			update_mural_ui()
	layout_walking_controls_and_hub()
	if visible_flag and panel_frame_control == mural_panel:
		refit_panel_camera()

func show_music_panel(visible_flag: bool) -> void:
	if not visible_flag and panel_frame_control == music_panel:
		panel_frame_control = null
	var was_vis := music_panel != null and music_panel.visible
	if visible_flag:
		talk_partner = -1
		if not was_vis:
			last_panel_dialogue = ""
		if mural_panel != null:
			mural_panel.visible = false
		if block_panel != null:
			block_panel.visible = false
	if music_panel != null:
		music_panel.visible = visible_flag
		if visible_flag:
			update_music_ui()
	layout_walking_controls_and_hub()
	if visible_flag and panel_frame_control == music_panel:
		refit_panel_camera()

func show_block_panel(visible_flag: bool) -> void:
	if not visible_flag and panel_frame_control == block_panel:
		panel_frame_control = null
	var was_vis := block_panel != null and block_panel.visible
	if visible_flag:
		block_panel_mode = "talk" if opening_conversation and talk_partner >= 0 else "hub"
		if not was_vis:
			last_panel_dialogue = ""
			var suggested := hub_button_for_objective(String(current_objective().get("id", "")))
			block_hub_page = maxi(0, block_buttons.find(suggested)) / BLOCK_ACTIONS_PER_PAGE
		if mural_panel != null:
			mural_panel.visible = false
		if music_panel != null:
			music_panel.visible = false
	if block_panel != null:
		block_panel.visible = visible_flag
		if visible_flag:
			update_block_ui()
		if following_player:
			target = player.position + Vector3.UP
			update_camera.call_deferred()
	layout_walking_controls_and_hub()

func toggle_block_panel() -> void:
	block_panel_mode = "hub"
	var next_vis := true
	if block_panel != null:
		next_vis = not block_panel.visible
	show_block_panel(next_vis)
	if next_vis:
		announce_a11y_status("Block readiness panel open. %s" % get_block_missing_summary())

func motif_button_text(motif_id: String, label_prefix: String) -> String:
	var prefix := "> " if active_motif == motif_id else ""
	if mural_placements.has(motif_id):
		var c_dict: Dictionary = mural_placements[motif_id]
		return "%s%s (%d,%d)" % [prefix, label_prefix, int(c_dict.get("col", 0)), int(c_dict.get("row", 0))]
	return "%sAdd %s" % [prefix, label_prefix] if is_narrow_layout() or uses_short_side_panels() else "%s%s · Paint" % [prefix, label_prefix]

func apply_character_panel_theme(panel: PanelContainer, n_id: String) -> void:
	if panel == null or panel_bg_style == null:
		return
	if n_id.is_empty():
		panel.add_theme_stylebox_override("panel", panel_bg_style)
		return
	if not character_panel_styles.has(n_id):
		var accent := Color(0.88, 0.70, 0.30, 0.92)
		for n in neighbors:
			if String(n.get("id", "")) == n_id:
				accent = Color(n.get("coat", accent)).lightened(0.24)
				accent.a = 0.96
				break
		var st := StyleBoxFlat.new()
		st.bg_color = Color(0.06, 0.10, 0.15, 0.95)
		st.border_color = accent
		st.set_border_width_all(3)
		st.set_corner_radius_all(8)
		st.content_margin_left = 8
		st.content_margin_right = 8
		st.content_margin_top = 0
		st.content_margin_bottom = 0
		character_panel_styles[n_id] = st
	panel.add_theme_stylebox_override("panel", character_panel_styles[n_id])

func update_mural_ui() -> void:
	if mural_label == null:
		return
	apply_character_panel_theme(mural_panel, "celeste")
	var state_tag := "3/3 Complete" if mural_completed else "%d/3 Motifs Painted" % mural_placements.size()
	var c_badge := String(NEIGHBOR_STORY_BADGES.get("celeste", "Painter"))
	var c_turn := posmod(maxi(1, celeste_talk_count) - 1, 5) + 1
	mural_label.text = "Talking with Celeste (Mural Artist · %s · Turn %d/5)  ·  Easel: %s (%s Palette)  ·  Sparks: %d" % [c_badge, c_turn, state_tag, mural_palette.capitalize(), spark_count()]
	if is_narrow_layout() or uses_short_side_panels():
		mural_label.text = "Celeste · Turn %d/5 · Sparks: %d" % [c_turn, spark_count()]
	if mural_detail_label != null:
		var has_custom_c := last_panel_dialogue.begins_with("Celeste: \"")
		var c_line := last_panel_dialogue if has_custom_c else celeste_dialogue_text()
		var c_mem := neighbor_memory_tail(CELESTE_ID, c_line, celeste_talk_count)
		var c_spoken := c_line
		if not c_mem.is_empty():
			if is_narrow_layout() and not has_custom_c:
				c_spoken = "Celeste: %s · %s" % [c_mem, c_line.trim_prefix("Celeste: ")]
			else:
				c_spoken = "%s · %s" % [c_line, c_mem]
		var instructions := "Select a motif. Move shifts it right; Clear empties the board."
		var detail := "%s %s" % [c_spoken, instructions]
		set_activity_detail(mural_detail_label, detail if browser_import_message.is_empty() else ("%s · %s" % [detail, browser_import_message]))
	if mural_buttons.size() == 9:
		var short := is_narrow_layout() or uses_short_side_panels()
		mural_buttons[5].text = "Move" if short else "Shift Motif"
		mural_buttons[6].text = "Clear" if short else "Clear Board"
		mural_buttons[7].text = "Hint" if short else "What's Next?"
		mural_buttons[8].text = "Close" if short else "Goodbye (Esc)"
	if mural_palette_btn != null:
		mural_palette_btn.text = "Palette: %s" % mural_palette.capitalize()
	if mural_sun_btn != null:
		mural_sun_btn.text = motif_button_text("sun", "Sun")
	if mural_wave_btn != null:
		mural_wave_btn.text = motif_button_text("wave", "Wave")
	if mural_rise_btn != null:
		mural_rise_btn.text = motif_button_text("rise", "Rise")

func update_music_ui() -> void:
	if music_toggle_btn != null:
		music_toggle_btn.text = "Music: On" if music_playing else "Music: Off"
		music_toggle_btn.set_pressed_no_signal(music_playing)
		music_toggle_btn.disabled = startup_story_pending
	if music_label == null:
		return
	apply_character_panel_theme(music_panel, "rook")
	var play_state := "Playing" if music_playing else "Paused"
	var mode_desc := "80 BPM Sketch" if music_mode == "sketch" else ("Local: %s" % local_music_name)
	var sc_state := "Ready" if rook_soundcheck_done else "Pending"
	var r_badge := String(NEIGHBOR_STORY_BADGES.get("rook", "Sound"))
	var r_turn := posmod(maxi(1, rook_talk_count) - 1, 5) + 1
	music_label.text = "Talking with Rook (Sound & Stories · %s · Turn %d/5)  ·  %s  ·  %s  ·  Soundcheck: %s  ·  Sparks: %d" % [r_badge, r_turn, play_state, mode_desc, sc_state, spark_count()]
	if is_narrow_layout() or uses_short_side_panels():
		music_label.text = "Rook · Turn %d/5 · Sparks: %d" % [r_turn, spark_count()]
	if music_stem_label != null:
		if not music_error.is_empty():
			set_activity_detail(music_stem_label, music_error)
		else:
			var has_custom_r := last_panel_dialogue.begins_with("Rook: \"")
			var r_line := last_panel_dialogue if has_custom_r else rook_dialogue_text()
			var r_mem := neighbor_memory_tail(ROOK_ID, r_line, rook_talk_count)
			var r_spoken := r_line
			if not r_mem.is_empty():
				if is_narrow_layout() and not has_custom_r:
					r_spoken = "Rook: %s · %s" % [r_mem, r_line.trim_prefix("Rook: ")]
				else:
					r_spoken = "%s · %s" % [r_line, r_mem]
			if music_mode == "local":
				set_activity_detail(music_stem_label, "Local full track: %s (procedural stems hidden) — %s Use Sketch returns to the original 80 BPM music." % [local_music_name, r_spoken])
			else:
				set_activity_detail(music_stem_label, "Original 80 BPM sketch · Soundcheck: %s · Groove Stems: %s — %s" % [sc_state, active_stem_summary(), r_spoken])
	if music_play_btn != null:
		music_play_btn.text = "Pause Groove" if music_playing else "Play Groove"
	if music_vol_btn != null:
		music_vol_btn.text = "Volume: %d%%" % int(round(music_volume * 100.0))
	if music_rook_btn != null:
		music_rook_btn.text = "Chat & Soundcheck (Done)" if rook_soundcheck_done else "Soundcheck w/ Rook"
	if music_sketch_btn != null:
		music_sketch_btn.text = "80 BPM Sketch (Active)" if music_mode == "sketch" else "Use 80 BPM Sketch"
	if music_buttons.size() == 7:
		var short := is_narrow_layout() or uses_short_side_panels()
		if short:
			music_rook_btn.text = "Chat w/ Rook" if rook_soundcheck_done else "Check Sound"
			music_sketch_btn.text = "Sketch On" if music_mode == "sketch" else "Use Sketch"
		music_buttons[5].text = "Hint" if short else "What's Next?"
		music_buttons[6].text = "Close" if short else "Goodbye (Esc)"

func set_activity_detail(control: RichTextLabel, value: String) -> void:
	# Periodic music/UI refreshes must not pull readers back to the first line.
	if control.text != value:
		control.text = value
		control.scroll_to_line(0)

func size_activity_detail(control: RichTextLabel) -> void:
	var font_size := 12 if is_narrow_layout() or uses_short_side_panels() else 14
	control.add_theme_font_size_override("normal_font_size", font_size)
	var font := control.get_theme_font("normal_font")
	control.custom_minimum_size.y = ceilf(font.get_height(font_size) * 2.0 + control.get_theme_constant("line_separation") + control.get_theme_stylebox("normal").get_minimum_size().y)

func make_activity_detail() -> RichTextLabel:
	var control := RichTextLabel.new()
	control.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	control.scroll_active = true
	control.focus_mode = Control.FOCUS_ALL
	if button_focus_style != null:
		control.add_theme_stylebox_override("focus", button_focus_style)
	control.add_theme_constant_override("line_separation", 2)
	control.add_theme_color_override("default_color", Color("f2ead8"))
	size_activity_detail(control)
	control.gui_input.connect(func(event: InputEvent):
		if event is InputEventScreenDrag:
			control.get_v_scroll_bar().value -= event.relative.y
			control.accept_event()
	)
	return control

func update_block_ui() -> void:
	if block_label == null:
		return
	var v_count := visited_neighbors.size()
	var n_total := neighbors.size() if not neighbors.is_empty() else 5
	var m_state := "3/3 Ready" if mural_completed else "%d/3" % mural_placements.size()
	var sc_state := "Soundcheck Ready" if rook_soundcheck_done else "Soundcheck Pending"
	var open_tag := "Block Party Open!" if block_opened else ("Ready to Open!" if is_block_ready() else "Meet Neighbors & Prepare")
	var talk_idx := block_panel_neighbor_idx()
	if talk_idx >= 0:
		var active_n: Dictionary = neighbors[talk_idx]
		var n_id := String(active_n.get("id", ""))
		apply_character_panel_theme(block_panel, n_id)
		var n_badge := String(NEIGHBOR_STORY_BADGES.get(n_id, String(active_n.get("role", "Neighbor"))))
		var n_turn := posmod(maxi(1, int(neighbor_talk_counts.get(n_id, 1))) - 1, 5) + 1
		block_label.text = "Talking with %s (%s · %s · Turn %d/5)  ·  %s  ·  %d/%d Met  ·  Mural %s  ·  Sparks: %d" % [String(active_n.get("name", "Neighbor")), String(active_n.get("role", "Neighbor")), n_badge, n_turn, open_tag, v_count, n_total, m_state, spark_count()]
		if is_narrow_layout() or uses_short_side_panels():
			block_label.text = "%s · Turn %d/5 · Sparks: %d" % [String(active_n.get("name", "Neighbor")), n_turn, spark_count()]
	else:
		apply_character_panel_theme(block_panel, "")
		block_label.text = "Turk St Conversation & Actions  ·  %s  ·  %d/%d Met  ·  Mural %s  ·  %s  ·  Sparks: %d" % [open_tag, v_count, n_total, m_state, sc_state, spark_count()]
		if is_narrow_layout():
			block_label.text = "Block Actions · Sparks: %d" % spark_count()
	if block_detail_label != null:
		var base_detail := ""
		if not last_panel_dialogue.is_empty():
			base_detail = last_panel_dialogue
		elif talk_idx >= 0:
			var n_id := String(neighbors[talk_idx].get("id", ""))
			var greet_line := neighbor_greeting_line(n_id)
			var mem_line := neighbor_memory_tail(n_id, greet_line, int(neighbor_talk_counts.get(n_id, 1)))
			var spoken := greet_line if mem_line.is_empty() else ("%s · %s" % [greet_line, mem_line])
			base_detail = "%s  (Click %s or press T to keep chatting)" % [spoken, String(neighbors[talk_idx].get("name", "neighbor"))]
			if is_narrow_layout():
				base_detail = spoken
		elif block_opened:
			base_detail = "The Turk Street block party is open! Choose a conversation or neighborhood activity below:"
		else:
			base_detail = "Walk up to any neighbor (1–5) to talk! Still needed to open the block party: %s" % get_block_missing_summary()
		var detail := base_detail if browser_import_message.is_empty() else ("%s · %s" % [base_detail, browser_import_message])
		if block_detail_label.text != detail:
			block_detail_label.text = detail
			block_detail_label.scroll_to_line(0)
	if block_open_btn != null:
		if block_opened:
			block_open_btn.text = "Party Open! (View)"
		elif is_block_ready():
			block_open_btn.text = "Open Block Party!"
		else:
			block_open_btn.text = "Open Block Party"
	if block_next_btn != null:
		var remaining := maxi(0, n_total - v_count)
		block_next_btn.text = "Meet Next (%d left)" % remaining if remaining > 0 else "Visit Next Neighbor"
	if block_epilogue_btn != null:
		if is_epilogue_done():
			block_epilogue_btn.text = "Gear Returned (3/3)"
		elif epilogue_packing:
			block_epilogue_btn.text = "Return Gear (%d/3)" % epilogue_returned.size()
		elif String(keepsake_photo.get("status", "unasked")) != "unasked":
			block_epilogue_btn.text = "Pack Borrowed Gear"
		else:
			block_epilogue_btn.text = "Take Group Photo"
	if block_programme_btn != null:
		if is_hosting_done():
			block_programme_btn.text = "Hosted All 4 Events"
		elif not hosting_order.is_empty():
			block_programme_btn.text = "Host Activity (%d/4)" % hosting_results.size()
		elif programme_published.size() == PROGRAMME_SEGMENTS.size():
			block_programme_btn.text = "Start Hosting Party"
		elif not programme_order.is_empty():
			block_programme_btn.text = "Plan Schedule (%d/4)" % programme_order.size()
		else:
			block_programme_btn.text = "Plan Party Schedule"
	if block_civic_btn != null:
		if civic_phase == "done":
			block_civic_btn.text = "Tenant Circle (Done)"
		elif civic_phase == "meeting":
			block_civic_btn.text = "Share Circle Notes"
		elif civic_phase == "planning":
			block_civic_btn.text = "Convene Circle"
		else:
			block_civic_btn.text = "Hold Tenant Circle"
	if block_film_btn != null:
		if film_phase == "done":
			block_film_btn.text = "Watch Film (%d/3)" % (film_screen_frame + 1)
		elif film_phase == "shooting":
			block_film_btn.text = "Shoot Frame (%d/3)" % film_captured.size()
		elif film_phase == "hold":
			block_film_btn.text = "Roll Camera (Clear)"
		elif film_phase == "planning":
			block_film_btn.text = "Set Up Film Shot"
		else:
			block_film_btn.text = "Shoot Short Film"
	if block_voices_btn != null:
		if voices_enabled:
			block_voices_btn.text = "Local Stories: Err" if voices_status == "error" else "Local Stories: On"
		else:
			block_voices_btn.text = "Read Local Stories"
	if block_mural_btn != null:
		block_mural_btn.text = "Mural (3/3)" if mural_completed else ("Paint w/ Celeste (%d/3)" % mural_placements.size())
	if block_rook_btn != null:
		block_rook_btn.text = "Soundcheck w/ Rook (OK)" if rook_soundcheck_done else "Soundcheck w/ Rook"
	if block_west_btn != null:
		block_west_btn.text = "Black Hawk Site (OK)" if blackhawk_discovered else "Walk to Black Hawk"
	if block_district_btn != null:
		block_district_btn.text = "District Border: On" if district_boundary_visible else "District Border: Off"
	if block_import_btn != null:
		block_import_btn.text = "Web Save Loaded" if browser_import_status == "imported" else "Import Web Save"
	update_objective_ui()
	apply_block_panel_mode()

func make_ui() -> void:
	button_focus_style = StyleBoxFlat.new()
	button_focus_style.bg_color = Color(0.95, 0.72, 0.19, 0.24)
	button_focus_style.border_color = Color(0.99, 0.82, 0.28, 1.0)
	button_focus_style.set_border_width_all(3)
	button_focus_style.set_corner_radius_all(6)

	button_normal_style = StyleBoxFlat.new()
	button_normal_style.bg_color = Color(0.11, 0.17, 0.22, 0.94)
	button_normal_style.border_color = Color(0.86, 0.68, 0.28, 0.85)
	button_normal_style.set_border_width_all(2)
	button_normal_style.set_corner_radius_all(6)
	button_normal_style.content_margin_left = 8
	button_normal_style.content_margin_right = 8
	button_normal_style.content_margin_top = 4
	button_normal_style.content_margin_bottom = 4

	button_hover_style = StyleBoxFlat.new()
	button_hover_style.bg_color = Color(0.18, 0.27, 0.34, 0.98)
	button_hover_style.border_color = Color(0.99, 0.84, 0.35, 1.0)
	button_hover_style.set_border_width_all(2)
	button_hover_style.set_corner_radius_all(6)
	button_hover_style.content_margin_left = 8
	button_hover_style.content_margin_right = 8
	button_hover_style.content_margin_top = 4
	button_hover_style.content_margin_bottom = 4

	button_suggest_style = StyleBoxFlat.new()
	button_suggest_style.bg_color = Color(0.36, 0.29, 0.10, 0.96)
	button_suggest_style.border_color = Color(1.0, 0.85, 0.36, 1.0)
	button_suggest_style.set_border_width_all(3)
	button_suggest_style.set_corner_radius_all(6)
	button_suggest_style.content_margin_left = 8
	button_suggest_style.content_margin_right = 8
	button_suggest_style.content_margin_top = 4
	button_suggest_style.content_margin_bottom = 4

	panel_bg_style = StyleBoxFlat.new()
	panel_bg_style.bg_color = Color(0.07, 0.11, 0.15, 0.92)
	panel_bg_style.border_color = Color(0.88, 0.70, 0.30, 0.88)
	panel_bg_style.set_border_width_all(2)
	panel_bg_style.set_corner_radius_all(8)
	panel_bg_style.content_margin_left = 8
	panel_bg_style.content_margin_right = 8
	panel_bg_style.content_margin_top = 0
	panel_bg_style.content_margin_bottom = 0

	var layer := CanvasLayer.new()
	add_child(layer)
	header_panel = PanelContainer.new()
	header_panel.add_theme_stylebox_override("panel", panel_bg_style)
	header_panel.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	header_panel.offset_left = 12
	header_panel.offset_right = -12
	header_panel.offset_top = 12
	layer.add_child(header_panel)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 1)
	header_panel.add_child(column)
	var title_row := HBoxContainer.new()
	column.add_child(title_row)
	var title_stack := VBoxContainer.new()
	title_stack.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_stack.add_theme_constant_override("separation", 0)
	title_row.add_child(title_stack)
	var title := Label.new()
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title.text = "TENDERLOIN REDUX / Godot block walk & study"
	title.clip_text = true
	title.add_theme_font_size_override("font_size", 20)
	title.add_theme_color_override("font_color", Color("ffe48f"))
	title_stack.add_child(title)
	music_toggle_btn = Button.new()
	music_toggle_btn.name = "MusicToggle"
	music_toggle_btn.custom_minimum_size = Vector2(94, 44)
	music_toggle_btn.toggle_mode = true
	music_toggle_btn.tooltip_text = "Background music. Starts with Start Exploring; tap to pause or resume. Volume controls are with Rook (V)."
	music_toggle_btn.add_theme_font_size_override("font_size", 13)
	style_game_button(music_toggle_btn)
	music_toggle_btn.pressed.connect(toggle_music_playback)
	title_row.add_child(music_toggle_btn)

	sounds_btn = Button.new()
	sounds_btn.name = "RewardSoundsToggle"
	sounds_btn.custom_minimum_size = Vector2(94, 44)
	sounds_btn.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	sounds_btn.toggle_mode = true
	sounds_btn.tooltip_text = "Gentle reward sounds. Music has separate controls with Rook."
	sounds_btn.add_theme_font_size_override("font_size", 13)
	style_game_button(sounds_btn)
	sounds_btn.pressed.connect(toggle_reward_sounds)
	title_row.add_child(sounds_btn)
	set_reward_sounds_enabled(reward_sounds_enabled, false)
	var details_btn := Button.new()
	details_btn.name = "HeaderInfoToggle"
	details_btn.text = "Info"
	details_btn.custom_minimum_size = Vector2(44, 44)
	details_btn.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	details_btn.toggle_mode = true
	details_btn.tooltip_text = "Show or hide details and map sources"
	details_btn.add_theme_font_size_override("font_size", 12)
	style_game_button(details_btn)
	details_btn.pressed.connect(func():
		set_header_details(details_btn.button_pressed)
	)
	title_row.add_child(details_btn)
	progress_label = Label.new()
	progress_label.name = "ProgressSummary"
	progress_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	progress_label.add_theme_font_size_override("font_size", 12)
	progress_label.add_theme_color_override("font_color", Color("ffe48f"))
	column.add_child(progress_label)
	objective_label = Label.new()
	objective_label.name = "ObjectiveLabel"
	objective_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	objective_label.max_lines_visible = 2
	objective_label.add_theme_font_size_override("font_size", 14)
	objective_label.add_theme_color_override("font_color", Color("9ef5e5"))
	column.add_child(objective_label)
	info = RichTextLabel.new()
	info.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	info.custom_minimum_size.y = 90
	info.scroll_active = true
	info.focus_mode = Control.FOCUS_ALL
	info.text = overview_text()
	info.visible = false
	info.add_theme_font_size_override("normal_font_size", 12)
	info.add_theme_color_override("default_color", Color("fff8e8"))
	column.add_child(info)
	var attribution := Label.new()
	attribution.text = "City: DataSF / PDDL · Streets: OSM / ODbL"
	attribution.add_theme_font_size_override("font_size", 10)
	attribution.add_theme_color_override("font_color", Color("b8c7c8"))
	column.add_child(attribution)

	mural_panel = PanelContainer.new()
	mural_panel.name = "MuralPanel"
	mural_panel.add_theme_stylebox_override("panel", panel_bg_style)
	mural_panel.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	mural_panel.offset_left = 12
	mural_panel.offset_right = -12
	mural_panel.offset_top = -354
	mural_panel.offset_bottom = -130
	mural_panel.visible = false
	layer.add_child(mural_panel)
	var mural_vbox := VBoxContainer.new()
	mural_vbox.add_theme_constant_override("separation", 2)
	mural_panel.add_child(mural_vbox)
	mural_label = Label.new()
	mural_label.clip_text = true
	mural_label.add_theme_font_size_override("font_size", 16)
	mural_label.add_theme_color_override("font_color", Color("ffe082"))
	mural_vbox.add_child(mural_label)
	mural_detail_label = make_activity_detail()
	mural_vbox.add_child(mural_detail_label)
	mural_buttons.clear()
	var row1 := HBoxContainer.new()
	row1.add_theme_constant_override("separation", 4)
	mural_vbox.add_child(row1)
	mural_button(row1, "Chat with Celeste", func(): talk_with_celeste())
	mural_palette_btn = mural_button(row1, "Palette: Garden", func(): cycle_mural_palette())
	var row2 := HBoxContainer.new()
	row2.add_theme_constant_override("separation", 4)
	mural_vbox.add_child(row2)
	mural_sun_btn = mural_button(row2, "Sun · Paint", func(): activate_or_advance_motif("sun"))
	mural_wave_btn = mural_button(row2, "Wave · Paint", func(): activate_or_advance_motif("wave"))
	mural_rise_btn = mural_button(row2, "Rise · Paint", func(): activate_or_advance_motif("rise"))
	var row3 := HBoxContainer.new()
	row3.add_theme_constant_override("separation", 4)
	mural_vbox.add_child(row3)
	mural_button(row3, "Shift Motif", func(): move_active_motif(1, 0))
	mural_button(row3, "Clear Board", func(): clear_mural_board())
	mural_button(row3, "What's Next?", func(): ask_whats_next())
	mural_button(row3, "Goodbye (Esc)", func(): end_conversation())
	update_mural_ui()

	music_panel = PanelContainer.new()
	music_panel.name = "MusicPanel"
	music_panel.add_theme_stylebox_override("panel", panel_bg_style)
	music_panel.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	music_panel.offset_left = 12
	music_panel.offset_right = -12
	music_panel.offset_top = -354
	music_panel.offset_bottom = -130
	music_panel.visible = false
	layer.add_child(music_panel)
	var music_vbox := VBoxContainer.new()
	music_vbox.add_theme_constant_override("separation", 2)
	music_panel.add_child(music_vbox)
	music_label = Label.new()
	music_label.clip_text = true
	music_label.add_theme_font_size_override("font_size", 16)
	music_label.add_theme_color_override("font_color", Color("ffe082"))
	music_vbox.add_child(music_label)
	music_stem_label = make_activity_detail()
	music_vbox.add_child(music_stem_label)
	music_buttons.clear()
	var m_row1 := HBoxContainer.new()
	m_row1.add_theme_constant_override("separation", 4)
	music_vbox.add_child(m_row1)
	music_play_btn = music_button(m_row1, "Play Groove", func(): toggle_music_playback())
	music_vol_btn = music_button(m_row1, "Volume: 70%", func(): cycle_music_volume())
	var m_row2 := HBoxContainer.new()
	m_row2.add_theme_constant_override("separation", 4)
	music_vbox.add_child(m_row2)
	music_rook_btn = music_button(m_row2, "Soundcheck w/ Rook", func(): request_rook_soundcheck())
	music_load_btn = music_button(m_row2, "Load Local Track", func(): prompt_local_music_file())
	var m_row3 := HBoxContainer.new()
	m_row3.add_theme_constant_override("separation", 4)
	music_vbox.add_child(m_row3)
	music_sketch_btn = music_button(m_row3, "80 BPM Sketch (Active)", func(): use_synth_sketch())
	music_button(m_row3, "What's Next?", func(): ask_whats_next())
	music_button(m_row3, "Goodbye (Esc)", func(): end_conversation())
	update_music_ui()

	block_panel = PanelContainer.new()
	block_panel.name = "BlockPanel"
	block_panel.add_theme_stylebox_override("panel", panel_bg_style)
	block_panel.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	block_panel.offset_left = 12
	block_panel.offset_right = -12
	block_panel.offset_top = -324
	block_panel.offset_bottom = -130
	block_panel.visible = false
	layer.add_child(block_panel)
	var block_vbox := VBoxContainer.new()
	block_vbox.add_theme_constant_override("separation", 2)
	block_panel.add_child(block_vbox)
	block_label = Label.new()
	block_label.clip_text = true
	block_label.add_theme_font_size_override("font_size", 16)
	block_label.add_theme_color_override("font_color", Color("ffe082"))
	block_vbox.add_child(block_label)
	block_detail_label = make_activity_detail()
	block_detail_label.custom_minimum_size.y = 30
	block_detail_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	block_detail_label.scroll_active = true
	block_detail_label.focus_mode = Control.FOCUS_ALL
	block_detail_label.add_theme_font_size_override("normal_font_size", 14)
	block_detail_label.add_theme_color_override("default_color", Color("f2ead8"))
	block_vbox.add_child(block_detail_label)
	block_buttons.clear()
	conv_buttons.clear()
	conv_rows.clear()
	conv_action_btns.clear()
	var c_row1 := HBoxContainer.new()
	c_row1.name = "ConversationChoices"
	c_row1.add_theme_constant_override("separation", 4)
	block_vbox.add_child(c_row1)
	conv_chat_btn = conv_button(c_row1, "Keep Chatting (T)", func(): keep_chatting())
	conv_next_btn = conv_button(c_row1, "What's Next?", func(): ask_whats_next())
	conv_bye_btn = conv_button(c_row1, "Goodbye (Esc)", func(): end_conversation())
	var c_row2 := HBoxContainer.new()
	c_row2.name = "ConversationActions"
	c_row2.add_theme_constant_override("separation", 4)
	block_vbox.add_child(c_row2)
	for slot in range(3):
		var slot_i := slot
		conv_action_btns.append(conv_button(c_row2, "...", func(): run_conversation_action(slot_i)))
	conv_rows.append(c_row1)
	conv_rows.append(c_row2)
	block_actions_grid = GridContainer.new()
	block_actions_grid.add_theme_constant_override("h_separation", 4)
	block_actions_grid.add_theme_constant_override("v_separation", 4)
	block_vbox.add_child(block_actions_grid)
	block_open_btn = block_button(block_actions_grid, "Open Block Party", func(): open_block_gathering())
	block_next_btn = block_button(block_actions_grid, "Meet Next (5 left)", func(): visit_next_unvisited_neighbor())
	block_epilogue_btn = block_button(block_actions_grid, "Take Group Photo", func(): advance_epilogue_step())
	block_programme_btn = block_button(block_actions_grid, "Plan Party Schedule", func(): advance_programme_and_hosting_step())
	block_mural_btn = block_button(block_actions_grid, "Paint w/ Celeste (0/3)", func(): open_mural_from_block_panel())
	block_rook_btn = block_button(block_actions_grid, "Soundcheck w/ Rook", func(): request_rook_soundcheck())
	block_west_btn = block_button(block_actions_grid, "Walk to Black Hawk", func(): walk_to_or_read_history_stop("blackhawk"))
	block_civic_btn = block_button(block_actions_grid, "Hold Tenant Circle", func(): advance_civic_step())
	block_film_btn = block_button(block_actions_grid, "Shoot Short Film", func(): advance_film_step())
	block_voices_btn = block_button(block_actions_grid, "Read Local Stories", func(): toggle_voices_enabled())
	block_district_btn = block_button(block_actions_grid, "District Border: On", func(): toggle_district_boundary())
	block_import_btn = block_button(block_actions_grid, "Import Web Save", func(): import_browser_save_from_web_storage())
	block_page_nav = HBoxContainer.new()
	block_page_nav.alignment = BoxContainer.ALIGNMENT_END
	block_page_nav.add_theme_constant_override("separation", 4)
	block_vbox.add_child(block_page_nav)
	block_page_prev = button(block_page_nav, "Previous", func(): change_block_action_page(-1))
	block_page_next = button(block_page_nav, "Next", func(): change_block_action_page(1))
	for nav in [block_page_prev, block_page_next]:
		nav.custom_minimum_size.y = 44
		nav.add_theme_font_size_override("font_size", 13)
	block_close_btn = block_button(block_page_nav, "Close", func(): show_block_panel(false))
	update_block_ui()

	controls = GridContainer.new()
	controls.columns = 3
	controls.add_theme_constant_override("h_separation", 8)
	controls.add_theme_constant_override("v_separation", 4)
	controls.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	controls.offset_left = 12
	controls.offset_right = -12
	controls.offset_top = -124
	controls.offset_bottom = -12
	layer.add_child(controls)
	next_hint_control = button(controls, "What's Next?", func(): ask_whats_next())
	map_control = button(controls, "Tenderloin Map", wide_overview)
	button(controls, "Find Me", frame_player_for_walking)
	zoom_in_control = button(controls, "Zoom In (+)", func(): zoom(0.8))
	zoom_out_control = button(controls, "Zoom Out (−)", func(): zoom(1.25))
	walk_control = button(controls, "", press_walk_control)
	# Act on press so arrival between press and release cannot start another route.
	walk_control.action_mode = BaseButton.ACTION_MODE_BUTTON_PRESS
	walk_control.button_up.connect(func(): walk_control_press_handled = false)
	update_walk_control()
	guide_arrow = Control.new()
	guide_arrow.name = "GuideArrow"
	guide_arrow.mouse_filter = Control.MOUSE_FILTER_IGNORE
	guide_arrow.visible = false
	guide_arrow_poly = Polygon2D.new()
	guide_arrow_poly.polygon = PackedVector2Array([Vector2(18, 0), Vector2(-12, -13), Vector2(-6, 0), Vector2(-12, 13)])
	guide_arrow_poly.color = Color("ffd25a")
	guide_arrow.add_child(guide_arrow_poly)
	guide_arrow_label = Label.new()
	guide_arrow_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	guide_arrow_label.add_theme_font_size_override("font_size", 15)
	guide_arrow_label.add_theme_color_override("font_color", Color("ffe48f"))
	guide_arrow_label.add_theme_color_override("font_outline_color", Color(0.05, 0.09, 0.12, 1.0))
	guide_arrow_label.add_theme_constant_override("outline_size", 6)
	guide_arrow.add_child(guide_arrow_label)
	layer.add_child(guide_arrow)
	build_story_card(layer)
	build_reward_banner(layer)
	var vp := get_viewport()
	var resize_controls := func():
		if not is_instance_valid(controls) or not is_inside_tree():
			return
		var narrow := is_narrow_layout()
		if uses_paged_block_actions() and block_panel.visible and block_panel_mode == "hub":
			var focused_index := block_buttons.find(get_viewport().gui_get_focus_owner())
			if focused_index >= 0 and focused_index < BLOCK_ACTION_COUNT:
				block_hub_page = focused_index / BLOCK_ACTIONS_PER_PAGE
		title_stack.visible = not narrow
		music_toggle_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL if narrow else Control.SIZE_SHRINK_CENTER
		sounds_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL if narrow else Control.SIZE_SHRINK_CENTER
		if is_instance_valid(title):
			title.add_theme_font_size_override("font_size", 16 if narrow else 20)
			title.text = "TL REDUX" if narrow else "TENDERLOIN REDUX"
		if is_instance_valid(info):
			info.add_theme_font_size_override("normal_font_size", 11 if narrow else 12)
		if is_instance_valid(objective_label):
			objective_label.add_theme_font_size_override("font_size", 12 if narrow else 14)
		if is_instance_valid(progress_label):
			progress_label.add_theme_font_size_override("font_size", 11 if narrow else 12)
		if is_instance_valid(mural_panel):
			if mural_panel.visible:
				update_mural_ui()
		if is_instance_valid(music_panel):
			if music_panel.visible:
				update_music_ui()
		if is_instance_valid(block_panel):
			update_block_ui()
			if following_player and block_panel.visible and block_panel_mode == "hub":
				update_camera.call_deferred()
		layout_walking_controls_and_hub()
		refit_panel_after_layout()
		layout_reward_banner()
		if in_overview or in_wide_overview:
			refit_after_layout()
	vp.size_changed.connect(resize_controls)
	for panel in [block_panel, mural_panel, music_panel]:
		panel.minimum_size_changed.connect(queue_compact_panel_layout)
		panel.resized.connect(queue_compact_panel_layout)
	header_panel.resized.connect(func():
		if uses_compact_activity_controls():
			layout_walking_controls_and_hub.call_deferred()
			if following_player:
				update_camera.call_deferred()
			refit_panel_after_layout()
	)
	tree_exiting.connect(func():
		stop_music_playback()
		voices_release_resources()
		if sketch_player != null:
			sketch_player.stream = null
		if local_audio_player != null:
			local_audio_player.stream = null
		if reward_audio_player != null:
			reward_audio_player.stop()
			reward_audio_player.stream = null
		sketch_generator = null
		if vp.size_changed.is_connected(resize_controls):
			vp.size_changed.disconnect(resize_controls)
	)
	resize_controls.call()

func style_game_button(control: Button) -> void:
	if button_focus_style != null:
		control.add_theme_stylebox_override("focus", button_focus_style)
	if button_normal_style != null:
		control.add_theme_stylebox_override("normal", button_normal_style)
	if button_hover_style != null:
		control.add_theme_stylebox_override("hover", button_hover_style)
		control.add_theme_stylebox_override("pressed", button_hover_style)
	control.add_theme_color_override("font_color", Color("fff8e6"))
	control.add_theme_color_override("font_hover_color", Color("ffe898"))
	control.add_theme_color_override("font_focus_color", Color("ffe898"))

func button(parent: Node, text: String, action: Callable) -> Button:
	var control := Button.new()
	control.text = text
	control.clip_text = true
	control.custom_minimum_size = Vector2(44, 50)
	control.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	control.focus_mode = Control.FOCUS_ALL
	style_game_button(control)
	control.add_theme_font_size_override("font_size", 20)
	control.pressed.connect(action)
	parent.add_child(control)
	return control

func mural_button(parent: Node, text: String, action: Callable) -> Button:
	var control := Button.new()
	control.text = text
	control.clip_text = true
	control.custom_minimum_size = Vector2(44, 44)
	control.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	control.focus_mode = Control.FOCUS_ALL
	style_game_button(control)
	control.add_theme_font_size_override("font_size", 16)
	control.pressed.connect(action)
	parent.add_child(control)
	mural_buttons.append(control)
	return control

func music_button(parent: Node, text: String, action: Callable) -> Button:
	var control := Button.new()
	control.text = text
	control.clip_text = true
	control.custom_minimum_size = Vector2(44, 44)
	control.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	control.focus_mode = Control.FOCUS_ALL
	style_game_button(control)
	control.add_theme_font_size_override("font_size", 16)
	control.pressed.connect(action)
	parent.add_child(control)
	music_buttons.append(control)
	return control

func block_button(parent: Node, text: String, action: Callable) -> Button:
	var control := Button.new()
	control.text = text
	control.clip_text = false
	control.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	control.custom_minimum_size = Vector2(44, 44)
	control.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	control.focus_mode = Control.FOCUS_ALL
	style_game_button(control)
	control.add_theme_font_size_override("font_size", 16)
	control.pressed.connect(action)
	parent.add_child(control)
	block_buttons.append(control)
	return control



