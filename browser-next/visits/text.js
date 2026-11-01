// Text and data copied from the Godot edition for the browser-next side stories, surprises
// and landmarks. Every value is Godot's own, verbatim (tests/next-visits.test.mjs reads godot/*.gd
// at test time and fails on any drift). Vector2/Vector3 constants are arrays: [x, z] / [x, y, z].
// The only rewording is WEB_OVERRIDES: key and control hints that the 2D fork does not bind.
// Pure data; no DOM, no fetch.
// godot/before_streets.gd
export const BEFORE = {
  FRAME: "This is Ramaytush homeland today. The Yelamu were the original people of what is now San Francisco; Ramaytush people continue to live today.",
  VIEWS: [
    "A low sweep of sand. The National Park Service describes wind carrying coastal sand inland across much of San Francisco. This drawing explains a regional process; it does not reconstruct this block.",
    "A gust carries loose grains across the ridge. The crest in this simplified drawing has shifted. No street, village, trail or coastline is being mapped here.",
    "Another gust leaves a different ridge. Landscapes change over long periods. These three drawings are observations of a process, not dated snapshots or a simulation of an exact place."
  ],
  REPLIES: [
    "Bea (fictional neighbor): \"You noticed the changing shapes. I like looking twice: a familiar place can show me something different. When you are ready, come see what we are making together.\"",
    "Bea (fictional neighbor): \"You noticed how much time a place holds. We can take our time too. There is a place for you in our afternoon, whenever you want to join.\""
  ],
  SOURCES: "Sources checked October 25, 2026.\nNational Park Service: regional wind-blown sand and dunes.\nhttps://www.nps.gov/places/000/dune-habitat-a-once-common-now-rare-commodity.htm\nAssociation of Ramaytush Ohlone: living people and Peninsula homeland.\nhttps://www.ramaytush.org/\nRamaytush Tribe: Yelamu and ongoing historical landscape research.\nhttps://www.ramaytushtribe.org/research.html\nOriginal schematic artwork and fictional Bea dialogue. This is not a community-authored cultural account; consultation and cultural acceptance have not occurred. No Indigenous voice, village, ceremony or historical trail is invented. Links are reading references; this scene makes no network requests.",
};
// godot/story_picker.gd
export const PICKER = {
  TITLES: ["Halloween: Lantern Procession","Election Walk: November 2024","Power stories","Two Dogs Home"],
};
// godot/shared_meal.gd
export const MEAL = {
  TABLE_SLOTS: [-1.8,-0.6,1.4,3.4],
  SERVING: ["Shared platter","Tasting plates"],
};
// godot/shared_meal_data.gd
export const MEAL_DATA = {
  RECIPES: [
    {
      "id": "kibbeh",
      "cook": "Nura",
      "title": "Kibbeh bil sanieh",
      "tradition": "Syrian Arab layered kibbeh pie",
      "welcome": "I am Nura. I came from Syria as a refugee, and I fix bicycles. Today I am making a layered kibbeh pie. Come press the base with me; we can talk while our hands are busy.",
      "ingredients": "Fine bulgur and lean meat dough; browned meat, onion, spices and nuts between the layers.",
      "source": "Recipe context: Ghinwa Alameen, Syrian Cooking, kibbeh bil sanieh and basic kibbeh dough. One documented version; families vary.",
      "url": "https://www.syriancooking.com/2010/09/08/kibbeh-bil-sanieh-kibbeh-pie/",
      "steps": [
        [
          "Prepare the bulgur dough",
          "Moistened fine bulgur, lean meat and onion become the outer layers. We are making the baked pie version."
        ],
        [
          "Brown the filling",
          "Cook the meat and onion, add the spices and nuts, then let the filling cool a little."
        ],
        [
          "Press base and add filling",
          "Press an even base into the tray and spread the cooked filling over it."
        ],
        [
          "Cover and score diamonds",
          "Cover with the remaining dough. Score the diamond pattern gently; keep the filling inside."
        ],
        [
          "Bake until golden",
          "The covered layers bake through and the top browns. Our stylized kitchen advances without a real cooking timer."
        ]
      ],
      "recognition": [
        "You kept the filling between those even layers. I will bring the big tray over; everyone can choose a diamond.",
        "Those little tasting plates make room for somebody who only has a minute. I will cut the pie along your diamond lines."
      ],
      "invite": "Mei has a daikon cake setting nearby. I think you would enjoy making the crisp edges with her."
    },
    {
      "id": "lobakgo",
      "cook": "Mei",
      "title": "Lo bak go",
      "tradition": "Cantonese daikon cake",
      "welcome": "I am Mei, a Cantonese American neighbor. I like plenty of daikon in my lo bak go. My other project today is convincing Nura to help mend my rattling kitchen trolley.",
      "ingredients": "Daikon; regular rice flour and cornstarch; dried shrimp, mushrooms, Chinese sausage and scallion.",
      "source": "Recipe context: Bill Leung, adapted from his sister Ginny's family version, The Woks of Life. Regular rice flour, not glutinous rice flour.",
      "url": "https://thewoksoflife.com/turnip-cake-lo-bak-go/",
      "steps": [
        [
          "Grate the daikon",
          "The pale strands are daikon. The cake is named for the radish, not a sweet cake batter."
        ],
        [
          "Cook the savory filling",
          "Cook the shrimp, mushrooms and sausage with scallion; set them aside while the daikon softens."
        ],
        [
          "Mix the rice-flour batter",
          "Combine the softened daikon, regular rice-flour mixture and savory filling."
        ],
        [
          "Steam and let it set",
          "Steam the batter, then let it cool and set before slicing. These steps are condensed here, without a timer."
        ],
        [
          "Slice and pan-fry",
          "Cut the set cake into slices and brown both faces. Pale centers and crisp golden edges belong together."
        ]
      ],
      "recognition": [
        "Look at those crisp edges around the daikon centers. Put the slices together on that platter; I will find the serving tongs.",
        "Two small tasting plates? Good idea. Someone can try a slice and come back for another without making a speech."
      ],
      "invite": "Mali has her mortar out. She offered to show us her beef pad kra pao after we finish here."
    },
    {
      "id": "krapao",
      "cook": "Mali",
      "title": "Beef pad kra pao",
      "tradition": "Thai holy-basil stir-fry",
      "welcome": "I am Mali. I am Thai, and an enthusiastic balcony gardener. The holy basil gets my last patch of sunlight. I want its leaves fragrant, so they go in after the heat is off.",
      "ingredients": "Beef, garlic and chilies; fish sauce, a little sugar and stock; holy basil. Jasmine rice and an egg for serving.",
      "source": "Recipe context: Pailin Chongchitnant, Hot Thai Kitchen, the specific beef version. Its browning order differs from some other versions.",
      "url": "https://hot-thai-kitchen.com/pad-kra-pao-beef/",
      "steps": [
        [
          "Pound chili and garlic",
          "Use the mortar to crush the chili and garlic into a rough aromatic mixture."
        ],
        [
          "Brown the beef",
          "In this documented beef version, brown the beef before adding the aromatic mixture."
        ],
        [
          "Toss in the aromatics",
          "Make room in the pan for the garlic and chili mixture, then toss it with the beef."
        ],
        [
          "Season, then turn heat off",
          "Add the sauce, stock and peppers. Finish the hot cooking before the basil goes in."
        ],
        [
          "Fold in holy basil",
          "Fold the leaves through the residual warmth. Serve the basil-flecked beef beside jasmine rice and an egg."
        ]
      ],
      "recognition": [
        "You saved the leaves for the end. I can see them through the beef instead of losing them in the pan. Let us carry the platter together.",
        "Those tasting plates leave a bright patch of rice beside the basil. I will put the condiments to one side so people can choose."
      ],
      "invite": "Grace is ready to fluff her red rice. She asked if we could bring our serving spoons over."
    },
    {
      "id": "redrice",
      "cook": "Grace",
      "title": "Gullah Geechee red rice",
      "tradition": "African American Lowcountry foodways",
      "welcome": "I am Grace, an African American neighbor with family ties to the South Carolina Lowcountry. I am also the person borrowing everybody's plant cuttings. Bring a serving spoon; there will be room for all our dishes.",
      "ingredients": "Parboiled rice, smoked pork sausage, onion, bell pepper and tomato paste, with seasonings.",
      "source": "Recipe context: Kardea Brown's Gullah red rice. This is one family version of a living African American food tradition, not every family's recipe.",
      "url": "https://kardeabrown.com/gullah-red-rice/",
      "steps": [
        [
          "Rinse the parboiled rice",
          "Start with parboiled rice and rinse it. The grains will take on the tomato mixture."
        ],
        [
          "Cook sausage and vegetables",
          "Cook the diced smoked sausage, onion and bell pepper until the vegetables soften."
        ],
        [
          "Coat the rice with tomato",
          "Stir in the tomato paste and seasonings, then coat the rice in that mixture."
        ],
        [
          "Cover and bake",
          "Add water, cover the baking dish and let the rice cook. Our untimed kitchen condenses the real waiting."
        ],
        [
          "Fluff and let it rest",
          "Fluff the cooked rice, then cover it for its final rest. Now the red grains can share the table."
        ]
      ],
      "recognition": [
        "There are the separate red grains I was looking for. Bring the serving pan; I want a seat where I can hear everybody.",
        "I like these little plates. They leave room to taste what the other cooks brought. Save one for me while I pass the spoons."
      ],
      "invite": "We have a meal to sit down with. Nura said she would happily cook beside you again whenever you return."
    }
  ],
};
// godot/dog_story.gd
export const DOGS = {
  NAMES: ["Pippin","Junebug"],
  DESCRIPTIONS: [
    "small rust dog, floppy ears, blue collar and ROUND tag",
    "tall cream dog, upright ears, green collar and TRIANGLE tag"
  ],
  LEADS: ["Turk / Taylor","Turk / Hyde","Gathering"],
  NOTES: [
    "Mara: Pippin has floppy ears and a round tag. My last sighting was where Turk meets Taylor.",
    "Imani: Junebug has upright ears and a triangle tag. My last sighting was at Turk and Hyde."
  ],
};
// godot/lantern_procession.gd
export const LANTERN = {
  LENGTH: 36,
  GAP: 4,
  CLEARANCE: 0.85,
};
// godot/power_story.gd
export const POWER = {
  NAMES: ["Welcome lights","Art lights","Rhythm lights"],
  VOICES: ["Bea","Celeste","Rook"],
  CLUES: [
    "Bring the path in from the left at the upper connector. Take it around all four corners to the upper-right lamp.",
    "Our inlet is above the upper-left connector. Lead the path around the square to the lower-left lamp below it.",
    "Start on the right of the lower-right connector. Visit all four corners and leave at the lower-left lamp."
  ],
  SOURCES: [[0,3],[0,0],[3,1]],
  SINKS: [[1,1],[2,2],[2,3]],
  DIRECTIONS: ["North","East","South","West"],
  ARRIVAL_M: 2,
};
// godot/main.gd
export const MAIN = {
  BOEDDEKER_PARK_OSM_WAY: 33619301,
  BOEDDEKER_PARK_RING: [
    [-159.26,-133.9],
    [-156.52,-113.06],
    [-154.53,-101.81],
    [-153.44,-98.92],
    [-150.94,-96.64],
    [-146.34,-95.1],
    [-112.12,-99.5],
    [-109.18,-99.87],
    [-109.17,-103.45],
    [-106.82,-103.49],
    [-107.37,-110.23],
    [-95.89,-112.85],
    [-99.84,-137.94],
    [-90.14,-139.8],
    [-90.85,-144.69],
    [-75.72,-146.91],
    [-82.38,-189.51],
    [-86.92,-188.63],
    [-90.68,-187.95],
    [-106.2,-185.2],
    [-99.33,-143.69]
  ],
  BOEDDEKER_PARK_ENTRANCE: [-126,-97.7],
  BOEDDEKER_VIEW_TARGET: [-118,2,-132],
  BOEDDEKER_PATH_POINTS: [[-126,-98.6],[-126.5,-114],[-112,-125.5],[-95.5,-141.5],[-90.5,-160],[-91,-180]],
  EATERY_HOST_LINES: {
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
  },
  EATERY_MENU_ITEMS: {
    "bowl_basil_pho": ["lemongrass beef pho","mushroom pho","imperial rolls"],
    "saffron_clay_oven": ["garlic naan","chana masala","mango lassi"],
    "blue_valve_hifi": ["botanical highball","1961 live jazz LP","neighborhood cocktail"],
    "morning_star_banh_mi": ["banh mi","condensed-milk iced coffee","pickled daikon side"],
    "copper_cue_tavern": ["cold draft","rack of pool","soul 45 on the jukebox"],
    "open_seat_diner": ["sourdough griddle cakes","hash browns","olallieberry pie"]
  },
  MUSEUM_DOCENT_LINES: [
    "Welcome to the Tenderloin Museum! Tap again and the Time-Portal will take us back.",
    "1961: Miles Davis played the Black Hawk at Turk & Hyde, just down the street.",
    "1966: at Compton's Cafeteria, trans women and neighbors stood up for each other.",
    "1907: the Cadillac Hotel opened right here as the city rebuilt after the quake."
  ],
  NEIGHBORHOOD_SURPRISE_IDS: [
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
  ],
  NEIGHBORHOOD_SURPRISES: {
    "jeffrey_record": {
      "title": "Jeffrey's Lost 1961 Record",
      "badge": "Secret Vinyl Find",
      "street": "361 Turk St sidewalk (beside the 'So What' awning)",
      "speaker": "Rook",
      "speech": "Hold up—that's Jeffrey's lost 1961 'Live at the Black Hawk' LP sleeve tucked in the cedar crate by 361 Turk! Wait till the 8th floor hears we found it.",
      "summary": "Found Jeffrey's lost 1961 Black Hawk vinyl pressing in the cedar crate beside the 361 Turk St 'So What' awning (fictional neighborhood story moment).",
      "pos": [-376.2,0,62.4],
      "accent": "f8cc58"
    },
    "hidden_mural_145": {
      "title": "The Hidden Mural at 145 Leavenworth",
      "badge": "Courtyard Art Discovery",
      "street": "145 Leavenworth St frontage (below the 8th-floor bay)",
      "speaker": "Celeste",
      "speech": "Look tucked beside the 145 Leavenworth archway—a painted courtyard triptych of golden horns, bay windows, and night-blooming jasmine!",
      "summary": "Spotted the hidden mural alcove at 145 Leavenworth below the 8th-floor turntable window (fictional story artwork on the real TL145 frontage).",
      "pos": [-284.5,0,95.8],
      "accent": "5fd4ba"
    },
    "impromptu_drag_show": {
      "title": "Surprise Impromptu Drag Show!",
      "badge": "Sidewalk Encore",
      "street": "Taylor & Turk (Transgender Cultural District)",
      "speaker": "Starlight",
      "speech": "Two-step on the velvet runner, darling! When Taylor and Turk light up, every sidewalk is a main stage!",
      "summary": "Cheered a joyful impromptu sidewalk drag encore near Compton's Corner in the Transgender Cultural District (fictional celebration on the real corner).",
      "pos": [-8.5,0,-18.5],
      "accent": "f5a3d0"
    },
    "viking_dirt_biker": {
      "title": "Random Guy on a Dirt Bike in a Viking Helmet",
      "badge": "Street Legend Sighting",
      "street": "200 block of Turk St (between Jones & Leavenworth)",
      "speaker": "Viking Rider",
      "speech": "Skol, neighbor! Just cruising Turk Street at an easy idle—horns polished, helmet strapped, waving hello to the whole block party!",
      "summary": "Spotted a friendly random guy idling on a dirt bike wearing a horned Viking helmet on the 200 block of Turk St (fictional Tenderloin street moment).",
      "pos": [-218,0,39.2],
      "accent": "ffb35c"
    },
    "cutesy_dino": {
      "title": "Small Cutesy Sidewalk Dinosaur",
      "badge": "Tiny Prehistoric Pal",
      "street": "Eddy & Jones sidewalk (by Boeddeker Park)",
      "speaker": "Pip the Tiny Dino",
      "speech": "Rawr-chirp! Just waddling past Boeddeker Park for a sunny leaf snack and a tiny stubby-arm wave to the whole block!",
      "summary": "Met a small cutesy pastel-mint dinosaur doing happy little hops by Boeddeker Park (fictional whimsical neighborhood surprise).",
      "pos": [-148,0,-52],
      "accent": "7ce8b0"
    },
    "magic_carpet_chef": {
      "title": "Wild Woman Chef on a Magic Carpet",
      "badge": "Flying Culinary Legend",
      "street": "Eddy & Leavenworth corridor",
      "speaker": "Chef Zafira",
      "speech": "Hold onto your taste buds, honey! When the star anise, garlic, and lemongrass hit the wok, this woven carpet lifts right off the sidewalk!",
      "summary": "Watched a wild woman chef in a tall white toque soar above the sidewalk on a fringed crimson-and-gold magic carpet (fictional whimsical neighborhood surprise).",
      "pos": [-258,0,-34],
      "accent": "ff7b9c"
    },
    "bite_size_nachos": {
      "title": "Bite-Sized Bags of Sidewalk Nachos",
      "badge": "Crunchy Corner Snack",
      "street": "Turk & Taylor sidewalk",
      "speaker": "Nacho Captain Rico",
      "speech": "Grab a bite-sized bag of warm tortilla chips with a little cup of roasted salsa verde—just enough crunch to keep you strolling!",
      "summary": "Found a sunny crate of bite-sized bags of nachos and salsa verde cups shared on the Turk & Taylor sidewalk (fictional neighborhood snack moment).",
      "pos": [-64,0,18],
      "accent": "ffb84d"
    },
    "good_donut_and_bagel": {
      "title": "A Really Good Donut & Everything Bagel",
      "badge": "Warm Bakery Treat",
      "street": "Eddy & Taylor sidewalk",
      "speaker": "Baker Mae",
      "speech": "Still warm from the rack! Take a pink-frosted glazed donut or a toasted everything bagel with whipped scallion cream cheese—or half of each!",
      "summary": "Shared a freshly glazed pink-sprinkle donut and a toasted everything bagel on the Eddy & Taylor sidewalk (fictional bakery treat moment).",
      "pos": [18,0,-56],
      "accent": "ff9ec4"
    },
    "clown_horn_walker": {
      "title": "Guy Walking Around with a Clown Horn",
      "badge": "Honk-Honk Stroller",
      "street": "Jones & Turk sidewalk",
      "speaker": "Honker Barnaby",
      "speech": "Honk-honk! Just keeping the sidewalk smiling—two gentle squeezes on the red rubber bulb right on Dez's 80 BPM downbeat!",
      "summary": "Met a cheerful guy strolling along Jones & Turk squeezing a brass-and-red-bulb clown horn in time with the block groove (fictional street character moment).",
      "pos": [-124,0,18],
      "accent": "ff6b6b"
    },
    "mayor_pomp_event": {
      "title": "Impromptu 'Mayor Public Event' & Ribbon Cutting",
      "badge": "A Little Pomp & Circumstance",
      "street": "Eddy & Leavenworth plaza corner",
      "speaker": "The Block Mayor",
      "speech": "Ahem—by the power vested in this tiny velvet podium and oversized golden scissors, I hereby proclaim today Official Neighbor Appreciation Hour! Cue the fanfare!",
      "summary": "Joined an impromptu 'Mayor Public Event' complete with a miniature podium, velvet rope stanchions, oversized golden ribbon-cutting scissors, and a little pomp and circumstance (fictional civic comedy moment).",
      "pos": [-296,0,-52],
      "accent": "ffd45e"
    }
  },
  NEIGHBOR_STORY_BADGES: {
    "bea": "Block Organizer · Warm & Steady",
    "celeste": "Sidewalk Muralist · Bright & Inviting",
    "rook": "Sound Keeper · Cool & Observant",
    "dez": "80 BPM Beatmaker · Easygoing Groove",
    "thanh": "Tea & Stools Host · Generous & Calm"
  },
  NEIGHBOR_SURPRISE_PAIRS: {
    "bea": ["mayor_pomp_event","good_donut_and_bagel"],
    "celeste": ["hidden_mural_145","cutesy_dino"],
    "rook": ["jeffrey_record","clown_horn_walker"],
    "dez": ["viking_dirt_biker","magic_carpet_chef"],
    "thanh": ["impromptu_drag_show","bite_size_nachos"]
  },
  SURPRISE_KEEPSAKE_META: {
    "jeffrey_record": {"neighbor":"rook","node":"JeffreyRecordTurntable","label":"Jeffrey's 1961 LP on Rook's speaker"},
    "clown_horn_walker": {"neighbor":"rook","node":"BarnabyClownHornClip","label":"Barnaby's clown horn on Rook's speaker"},
    "hidden_mural_145": {
      "neighbor": "celeste",
      "node": "HiddenMuralSketchCard",
      "label": "145 Leavenworth sketch on Celeste's easel"
    },
    "cutesy_dino": {"neighbor":"celeste","node":"PipDinoMascot","label":"Pip the Tiny Dino on Celeste's easel"},
    "mayor_pomp_event": {"neighbor":"bea","node":"MayorRibbonRosette","label":"Golden ribbon rosette on Bea's walker"},
    "good_donut_and_bagel": {"neighbor":"bea","node":"BakeryTreatBox","label":"Mae's donut & bagel box on Bea's walker"},
    "viking_dirt_biker": {"neighbor":"dez","node":"VikingHornCharm","label":"Mini Viking badge on Dez's notebook"},
    "magic_carpet_chef": {"neighbor":"dez","node":"ZafiraSpiceCarpet","label":"Chef Zafira's mini carpet beside Dez"},
    "impromptu_drag_show": {
      "neighbor": "thanh",
      "node": "StarlightRunwayCrown",
      "label": "Starlight's fan & tiara on Thanh's crate"
    },
    "bite_size_nachos": {"neighbor":"thanh","node":"RicoMiniNachoBag","label":"Rico's mini nacho bag on Thanh's crate"}
  },
  MUSEUM_HUB_POS: [-293.5,0,-64.5],
  SO_WHAT_VIEW_TARGET: [-320,14,82.6],
  NEIGHBORHOOD_EATERIES: [
    {
      "id": "bowl_basil_pho",
      "name": "Bowl & Basil Pho Counter",
      "kind": "Eatery",
      "street": "400 block of Turk St",
      "specialty": "24-hour simmered lemongrass beef & mushroom pho, crispy imperial rolls, and iced Thai tea",
      "pos": [-384,0,63.8],
      "canopy_color": "b83b2b",
      "label_color": "ffe699"
    },
    {
      "id": "saffron_clay_oven",
      "name": "Saffron Clay-Oven Naan & Curry",
      "kind": "Eatery",
      "street": "Jones St near Eddy",
      "specialty": "Tandoori clay-oven garlic naan, smoky chana masala, and mango lassi served late",
      "pos": [-152,0,-28],
      "canopy_color": "d47a27",
      "label_color": "ffe8a3"
    },
    {
      "id": "blue_valve_hifi",
      "name": "The Blue Valve Vinyl & Hi-Fi Bar",
      "kind": "Bar & Lounge",
      "street": "300 block of Eddy St (near Cadillac Hotel)",
      "specialty": "Warm tube-amp jazz LPs, zero-proof botanical highballs, and classic neighborhood cocktails",
      "pos": [-258,0,-71.5],
      "canopy_color": "224868",
      "label_color": "8de4e8"
    },
    {
      "id": "morning_star_banh_mi",
      "name": "Morning Star Banh Mi & Coffee",
      "kind": "Eatery",
      "street": "100 block of Turk St",
      "specialty": "Crackling warm baguettes with pickled daikon-carrot, jalapeño, cilantro, and condensed-milk iced coffee",
      "pos": [-54,0,11.2],
      "canopy_color": "2f6e4e",
      "label_color": "ffe699"
    },
    {
      "id": "copper_cue_tavern",
      "name": "Copper Cue Tavern & Billiards",
      "kind": "Corner Bar",
      "street": "Leavenworth St between Turk & Eddy",
      "specialty": "Vintage neon booths, neighborhood pool table, jukebox soul 45s, and cold draft pours",
      "pos": [-312,0,-22],
      "canopy_color": "5a3463",
      "label_color": "f5c2ff"
    },
    {
      "id": "open_seat_diner",
      "name": "Open Seat Diner & Pie Counter",
      "kind": "Eatery",
      "street": "Taylor St opening block",
      "specialty": "Sourdough griddle cakes, hash browns, counter stools, and warm olallieberry pie",
      "pos": [10.5,0,26],
      "canopy_color": "356873",
      "label_color": "ffe8a3"
    }
  ],
  TOUR_MUSEUM_ERAS: ["present","1961_jazz","1966_comptons","1907_cadillac"],
  TOUR_MUSEUM_TITLES: ["Museum: Present Day","Museum: 1961 Jazz","Museum: 1966 Compton's","Museum: 1907 Cadillac"],
  SO_WHAT_AWNING_XZ: [-350,65.8],
};
export const GODOT_CONSTANTS = { 'before_streets.gd': BEFORE, 'story_picker.gd': PICKER, 'shared_meal.gd': MEAL, 'shared_meal_data.gd': MEAL_DATA, 'dog_story.gd': DOGS, 'lantern_procession.gd': LANTERN, 'power_story.gd': POWER, 'main.gd': MAIN };
// Godot string literals grouped by file and function, in source order (drift-tested).
export const GODOT_TEXT = {
  'before_streets.gd': {
    setup: {
      title: "Before These Streets",
      subtitle: "Ramaytush homeland, then and now\nOriginal regional illustration | Not a map",
      previous: "Previous view",
      gust: "Send a gust",
      shapes: "Changing shapes",
      time: "Passing time",
      sources: "Sources",
      return: "Return",
    },
    open_opening: {
      refuse: "Use Stop and close the current activity or story visit before Before These Streets. It is available in every chapter.",
    },
    close_opening: {
      closed: " Back to your existing chapter. Your observation stays in this opening for this visit; reload starts it fresh. Revisit through Info when idle.",
    },
    refresh: {
      observed: "Your observation stays here this visit. Reload starts it fresh; it is never required for the ending.",
      prompt: "Send a gust to change the illustration, or choose what you notice. No timer, score or required answer. You can skip at any point.",
      backToScene: "Back to scene",
      sources: "Sources",
      backToStart: "Back to start",
      backToBlock: "Back to block",
      backTip: "Skip or return to your unchanged chapter; no progress or audio is started.",
      announce: "Before These Streets. ",
    },
    art_description: {
      template: "Schematic regional illustration, view %d of 3: %s. %s",
      view0: "low sand ridges",
      view1: "wind-borne grains and a shifted crest",
      view2: "a second shifted ridge",
      card: "Fictional Bea's observation card is open.",
      none: "No mapped settlement or cultural scene.",
    },
  },
  'story_picker.gd': {
    setup: {
      title: "Your story visits",
      earlier: "Earlier",
      later: "Later",
      follow: "Follow this invitation",
      followName: "Follow Imani's invitation: Lantern Procession",
      explore: "Keep exploring",
      back: "Back to stories",
    },
    open_picker: {
      refuse: "Close the current activity before choosing a story visit.",
      announce: "Your story visits. ",
    },
    back_to_stories: {
      announce: "Back to the street. Story choices are unchanged.",
    },
    refresh: {
      continue: "Continue",
      resume: "Resume",
      visit: "Visit",
      entrySuffix: ". Progress for this visit only.",
      invitation: "Imani: \"Pippin and Junebug are home. Come make a lantern with us whenever you are ready.\" Personal invitation: Lantern Procession is still available.\n",
      completed: "Completed this visit: ",
      detail: "Switch stories without losing this visit's choices. Travel stops; only your chosen story is shown. End clears that story's play state; reload clears all visits and invitations. F8 resumes your active story, or a paused Power visit; Shift F8 opens these choices.",
    },
    add_reader_entry: {
      label: "Other\nstories",
      name: "Other story visits. Keep this visit's progress. Shift F8.",
    },
    remember_completed: {
      larkin: "Larkin 2017",
      festival: "Lights Back On",
    },
    offer_lantern: {
      dogs: "Two Dogs Home",
    },
    select_story: {
      refused: "That story could not open. Your previous visit is kept.",
    },
    keep_exploring: {
      announce: "Keep exploring. Your story choices and invitations stay for this visit. Reload starts them fresh.",
    },
  },
  'shared_meal.gd': {
    setup: {
      credit: "Original fictional neighbors | Stylized, untimed cooking | This visit only",
      previous: "Previous cook",
      next: "Next cook",
      near: "Near edge",
      other: "Other edge",
      share: "Share this dish",
      explore: "Keep exploring",
    },
    open_meal: {
      closed: "Open the neighborhood gathering before cooking together.",
      story: "Pause your story visit first: Other stories, then Keep exploring.",
      busy: "Finish arriving or use Stop, then close the current activity before cooking.",
      hosting: "Finish hosting this gathering before cooking together. Host Activity continues the programme.",
    },
    close_meal: {
      announce: "Back to the street. Your meal, preparation and invitations stay for this visit. Reload starts them fresh.",
    },
    advance: {
      again: "A new preparation. The already shared dish stays on the table until you deliberately share again.",
    },
    refresh: {
      step: "\nStep %d/5: %s",
      ready: "\nReady to share. Choose a serving style and a safe place for your dish.",
      shared: "\nShared this visit: %d/4 dishes. %s",
      follow: " Follow this invitation visits ",
      retains: ". Keep exploring retains it.",
      condensed: "\nCondensed preparation, not a complete real-world recipe. Reload clears this visit's meal and invitations.",
      again: "Try another preparation",
      previousName: "Previous revealed cook. Current: ",
      nextName: "Next revealed cook. Current: ",
      followLabel: "Follow this invitation",
      shareLabel: "Share this dish",
      cueStep: "Step %d of5: %s. %s",
      cueReady: "Ready to share. Choose a serving style and place.",
    },
    art_description: {
      shape0: "a layered bulgur pie with diamond cuts",
      shape1: "pale rectangular daikon cakes with browned faces",
      shape2: "basil-flecked beef beside rice and an egg",
      shape3: "separate tomato-red rice grains with sausage and peppers",
      prefix: "Original illustration: ",
      template: ". Preparation %d/5. %s.",
    },
  },
  'dog_story.gd': {
    setup: {
      credit: "Original fiction | City/PDDL | OSM/ODbL",
      info: "SFACC info",
      begin: "Begin search",
      walk: "Walk to lead",
      match: "Match dog",
      end: "End search",
      musicOff: "Music: Off",
      back: "Back",
    },
    choose_lead: {
      chose: "You chose ",
      choseTail: " from the notes. Walk there to look; a lead is not a confirmed sighting.",
    },
    open_story: {
      refuse: "Finish arriving and close other activities. End an active power story before Two Dogs Home.",
    },
    close_story: {
      announce: "Back to the block. Dog search stays for this visit; End search or reload clears it.",
    },
    begin: {
      begun: "Read an owner's note, choose a lead, then walk and compare the dog. No timer or penalty.",
    },
    end_session: {
      ended: "Search ended. Ordinary chapter progress and your saved keepsake are unchanged.",
    },
    blocked_route: {
      blocked: "That walk stopped. Choose Dog search to pick a different approach. No progress was lost.",
    },
    match_dog: {
      noDog: "No missing dog is at the gathering. Compare the owners' street-corner notes.",
      reunion: "Two dogs home! Mara: \"Those floppy ears! Welcome back, Pippin.\" Imani: \"Junebug, there is your triangle tag. Thank you for bringing us together.\" Original fictional reunion. Imani: \"Come make a lantern with us whenever you are ready.\" Other stories keeps this personal invitation.",
      differs: "This is ",
      differs2: ". That differs from ",
      differs3: "'s note. Try the other profile; there is no penalty.",
      already: " is already matched. Find the other dog, then meet both owners at the gathering.",
      matched: " matched by ears and tag, not color alone. The fictional owner has your sighting. ",
      both: "Both found! Choose Gathering, walk there and Reunite.",
      next: "Read the other owner's note and choose your next lead.",
    },
    objective: {
      chooseLead: "Choose a lead",
      prefix: "Two Dogs Home: ",
      reunited: "Reunited!",
      count: "%d/2 matched - %s",
      chooseLower: "choose a lead",
      hint: "Dog search resumes your owner notes. You choose where to look. End search returns to your afternoon.",
    },
    refresh: {
      heading: "Two Dogs Home | %d/2 matched%s",
      headingWon: " | Reunited!",
      intro: "Original visiting dogs and owners; imaginary sightings on real streets. Begin search, compare notes, choose among the three leads, and look for both dogs in either order. No chase, timer or penalty.",
      lead: "Your selected lead: ",
      none: "none - choose a street corner from the notes",
      noDog: "The gathering has no missing dog here.",
      ready: "Both owners are ready. Choose Reunite.",
      observed: "Observed here: ",
      compare: ". Compare with the selected profile, then Match dog.",
      walk: "Walk to your chosen lead; Stop Walking cancels arrival intent.",
      info: "REAL SERVICE REFERENCE, checked October 22, 2026: San Francisco Animal Care & Control, 1419 Bryant Street at Alameda. OUTSIDE this Tenderloin play area. https://www.sfanimalcare.org/lost-found-pets/report-a-lost-pet/ . Check its official page for current information. No report is sent and no partnership or agency intake is simulated. These dogs, owners and sightings are fiction. Choose SFACC info again to return to the notes.",
      visitOnly: "\nVisit only: Back keeps this search; End or reload clears it. No saved progress, photo, reward or soundtrack changes.",
      reunite: "Reunite",
      match: "Match dog",
      musicOn: "Music: On",
      musicOff: "Music: Off",
      soundtrack: ". Independent soundtrack.",
    },
  },
  'lantern_procession.gd': {
    setup: {
      credit: "Original fiction | City/PDDL | OSM/ODbL",
      bat: "Bat cape",
      star: "Stargazer cape",
      moon: "Moon lantern",
      starLantern: "Star lantern",
      begin: "Begin",
      walk: "Walk / March",
      gather: "Gather / Finish",
      end: "End parade",
      musicOff: "Music: Off",
      back: "Back",
    },
    open_story: {
      noRoute: "The parade route has no clear space here. Your other stories are still available.",
      refuse: "Open the gathering, finish arriving and End the other story before the Lantern Procession.",
    },
    close_story: {
      announce: "Back to the block. Your parade stays for this visit. End or reload clears it.",
    },
    begin: {
      begun: "Choose your paper costume and lantern, then walk to assembly.",
    },
    end_session: {
      ended: "Parade ended. Your ordinary afternoon continues.",
    },
    advance: {
      paused: "Return to your paused group with March, then lead the lanterns to the finish.",
      ready: "Costumes ready! Lead the two visitors down this fictional Halloween route. Choose March. Stop pauses everyone.",
      won: "A little parade, a big welcome! Bea: \"Look at those handmade lanterns.\" Celeste: \"Every paper cape has its own story.\" The visiting neighbors stay together for this visit.",
    },
    blocked_route: {
      blocked: "The procession is paused. Return to the marked route and choose March again; your choices remain.",
    },
    objective: {
      assembly: "Assembly",
      finish: "Parade finish",
      prefix: "Lantern Procession: ",
      won: "Welcome home!",
      meet: "Meet the costume makers",
      left: "Lead the lanterns - %.0f m left",
      hint: "Parade resumes your choices and march. Stop pauses the group. End returns to your afternoon.",
    },
    refresh: {
      heading: "Lantern Procession | ",
      welcome: "Welcome!",
      makers: "Costume makers",
      lead: "Lead the lanterns",
      route: "\nOriginal fictional Halloween procession on the modeled Turk block. ",
      bat: "Bat cape",
      star: "Stargazer cape",
      moon: "Moon lantern",
      starLantern: "Star lantern",
      phase0: "Walk to assembly, then Gather to lock your paper choices.",
      won: "Your two visiting neighbors are here. Enjoy your handmade parade.",
      phase1: "March to the finish, then Welcome everyone. The group moves only while you follow this route; Stop pauses it.",
      source: "\nTLCBD documented Halloween events in 2019 and 2021; this route, visitors, costumes and dialogue are original fiction. No historical parade route is claimed. Back keeps this visit; End or reload clears it. Music is independent.",
      walkLabel: "Walk to assembly",
      march: "March",
      gather: "Gather",
      welcomeLabel: "Welcome",
      musicOn: "Music: On",
      musicOff: "Music: Off",
    },
    _process: {
      back: "Back with your neighbors. Choose March to lead the lanterns.",
    },
  },
  'power_story.gd': {
    setup: {
      credit: "Fictional event kit | City/PDDL | OSM/ODbL",
      map0: "Larkin / Eddy",
      map1: "40 m",
      map2: "N",
      map3: "Eddy Street",
      relay: "Relay %d",
      begin: "Begin\nstory",
      walk: "Walk to\nrelay",
      check: "Check\npath",
      end: "End\nstory",
      musicOff: "Music: Off",
      back: "Back",
      dogs: "Missing\ndogs",
      more: "More\nstories",
      story: "Story",
      storyTip: "Neighborhood Stories: resume F8; switch story visits Shift F8",
    },
    phase_name: {
      larkin0: "Larkin / Eddy battery light",
      larkin1: "Turk gathering art lights",
      larkin2: "Turk gathering rhythm lights",
    },
    objective: {
      text: "Power Story: %s (%d/3 lights restored)",
      connected: "Neighbors connected!",
      back: "You brought the lights back!",
      hint: "Choose Power Story to walk to and connect the next fictional light kit. ",
      hintEnd: "End story returns to your usual afternoon.",
      clue: " has a clue for ",
    },
    open_story: {
      refuse: "Open the gathering, finish arriving and close any chapter or activity before Power Story.",
    },
    close_story: {
      back: "Back to the block. ",
      active: "Power Story progress stays for this visit; End story restores ordinary lighting. Reload starts fresh.",
      idle: "Ordinary lighting and saved progress are unchanged.",
    },
    begin: {
      festival: "Bea: \"Our fictional festival light kit has gone dark. Help us link the three relays. No rush - we have each other.\"",
      larkin: "Bea: \"Let us keep neighbors connected while the utility crews work. First, bring a portable battery light to our imagined meeting point at Larkin and Eddy.\"",
    },
    end_session: {
      ended: "The afternoon is just as you left it. Thanks for helping. Choose Replay story to bring the crew together again.",
    },
    walk_to_relay: {
      already: "You are already at this light kit. Choose a connector or another light.",
      walking: "Walking to %s. Stop Walking cancels. Its %s opens after arrival.",
      battery: "battery view",
      repair: "repair view",
      closed: "That route is not open. Try another relay, or return to the street and choose a different approach.",
    },
    rotate: {
      linked: "Connector %d now links %s to %s.",
    },
    check_path: {
      notYet: "Not connected yet. Trace from the IN arrow through all four elbows to OUT. Every turn can be changed; there is no penalty.",
      there: ": \"There it is! ",
      backOn: " are back. You made the connection.\"",
      won: "Bea: \"You brought our lights back! The whole crew is cheering for you. Our block is glowing again.\" Take a walk under the lights, or End story to return to your afternoon.",
      portable: ": \"Our portable light is ready. Thanks for looking after your neighbors.\"",
      larkinWon: "Bea: \"You kept our neighbors connected!\" In the real April 21, 2017 outage, PG&E restored service by 4:46 p.m. This battery-light adventure and its residents are original fiction.",
    },
    refresh: {
      moreName: "More neighborhood stories",
      dogsName: "Two Dogs Home: original missing-dogs search and reunion",
      heading: "Lights Back On | %d/3",
      headingLarkin: "Larkin 2017 | %d/3 neighbor lights",
      creditLarkin: "Real place / imagined support | SF/PDDL | OSM/ODbL",
      credit: "Fictional event kit | City/PDDL | OSM/ODbL",
      ended: "Lights Back On | Story ended",
      hub: "Neighborhood Stories",
      hubCredit: "Original stories | City/PDDL | OSM/ODbL",
      intro: "A fictional, untimed power-restoration adventure. Three portable light relays, three neighbors' clues, and you making the lights shine again. Follow the triangle inlet through all four elbows to the round lamp. Progress is for this visit only; reload starts fresh. Music is your independent soundtrack. This event kit is not a real utility map or electrical repair training.",
      relay: "Relay %d: %s. %s: \"%s\"\nIN: %s of connector %d. OUT: %s of connector %d. Connect all four elbows.\n",
      restored: "This relay is restored. Choose another relay or Back to see the lights.",
      atRelay: "You are at the relay. Turn a connector, then Check path.",
      walkFirst: "Choose Walk to relay. The repair surface opens when you arrive; Stop Walking cancels.",
      backKeeps: "\nBack keeps this visit's progress. End story restores usual lighting. Reload starts this story fresh.",
      battery: "Choose Battery view to continue your visit.\n",
      beginLarkin: "Choose Begin story to visit Larkin/Eddy, help with an imagined battery light, then bring two more lights back to the gathering on Turk near Taylor/Mason. The utility site is never entered.\n",
      inspired: "April 21, 2017 inspired fiction | ",
      distance: "\nThis imagined gathering station is %.0f m from Larkin/Eddy in a straight line, on Turk near Taylor/Mason; it is not utility equipment.",
      restoredReal: "\nPG&E restored real utility service. Your task is a fictional battery-light link. Case map has the dated sources.",
      repairSurface: "repair surface",
      batteryView: "battery view",
      unavailable: "The Larkin street approach is unavailable; Begin is disabled rather than moving the location.\n",
      room: "Make the window taller or wider to use all four connectors. Back and End story remain available.\n",
      pad: "Turn connector %d: %s to %s",
      tab: "Relay %d%s",
      ok: " OK",
      tabName: "Relay %d: %s, %s",
      restoredWord: "restored",
      notRestored: "not yet restored",
      festival: "Festival",
      larkin: "Larkin\n2017",
      placeMap: "Place\nmap",
      festivalName: "Original fictional festival story",
      larkinName: "Larkin, April 21, 2017 inspired story",
      placeName: "Larkin place map and complete sources",
      batteryButton: "Battery\nview",
      caseMap: "Case\nmap",
      replay: "Replay\nstory",
      begin: "Begin\nstory",
      musicOn: "Music: On",
      musicOff: "Music: Off",
    },
    _process: {
      musicOn: "Music: On",
      musicOff: "Music: Off",
      soundtrack: ". Independent soundtrack.",
    },
    source_text: {
      text: "REAL PLACE / HISTORY: Larkin Substation, 600 Larkin Street at Eddy. April 21, 2017: a circuit-breaker cabinet arc and fire interrupted service for about 88,000 customers, from about 9:06 a.m. to full restoration at 4:46 p.m. PG&E restored utility service. This was not a verified transformer explosion.\nORIGINAL FICTION: portable battery-light tasks, residents and dialogue; not actual utility repairs, equipment, entrances or an active fault.\nMAP: north up; scale bar 40 m. Gold dot: city Larkin/Eddy intersection. White dot: city address point, not an entrance. Plain exterior: OSM footprint and reported 9 m height, stylized color, not a surveyed current facade. Only the Eddy approach is added to walking coverage; Larkin Street beyond it is not modeled.\nSOURCES: Exponent report, September 15, 2017, commissioned by PG&E and hosted by CPUC, printed pages 1, 9, 34; PG&E April 21, 2017 restoration release. SF EAS 491045 and intersection CNN 25148000 (PDDL); OpenStreetMap way 71209428 and Eddy way 30832489 (ODbL). Geographic records retrieved October 22, 2026; address record updated August 16, 2018. These are historical sources, not current outage guidance.",
    },
    blocked_route: {
      blocked: "The route to relay %d stopped. Choose Power Story to try again or choose another relay.",
    },
  },
  'voting_story.gd': {
    setup: {
      credit: "Historical list | City/PDDL | OSM/ODbL",
      cadillac: "Cadillac\n380 Eddy",
      boeddeker: "Boeddeker\n246 Eddy",
      warm: "Warm paper",
      cool: "Cool paper",
      begin: "Begin walk",
      walk: "Walk",
      record: "Record site",
      make: "Make map",
      share: "Share map",
      end: "End walk",
      musicOff: "Music: Off",
      back: "Back",
      label0: "1 380 Eddy St\nCadillac",
      label1: "2 246 Eddy St\nBoeddeker",
    },
    valid_source: {
      election: "2024-11-05",
      published: "2024-10-03",
      id0: "750",
      id1: "2092",
      eas0: "490999",
      eas1: "490979",
      address0: "380 Eddy St",
      address1: "246 Eddy St",
      room0: "Lobby",
      room1: "Meeting Room",
    },
    open_story: {
      refuse: "Open the gathering, finish arriving and End the other story before this historical map walk.",
    },
    close_story: {
      announce: "Back to the block. This historical map stays for this visit; End or reload clears it.",
    },
    begin: {
      begun: "Bea: \"Help us make a little map from two published records. We are observing outside, not entering polling rooms.\" Choose either site and Walk.",
    },
    choose: {
      selected: "Selected ",
    },
    record_site: {
      recorded: "Recorded ",
      list: " from the October 3 published list. This outdoor stop is not its doorway.",
      both: " Both records found! Choose Make map.",
    },
    make_map: {
      make: "Choose an address label, then tap its numbered address pin on your paper map. North is up; the upper sloping line is Eddy Street, with Turk below. A mismatch is harmless.",
    },
    place_label: {
      belongs: "That pin belongs to ",
      selected: ". Your selected label is ",
      nothing: ". Choose its matching pin; nothing was lost.",
      placed: "Placed ",
      onPin: " on its city address pin.",
      fit: " Both labels fit! Return to Bea and Share your original map.",
    },
    share_map: {
      won: "Bea: \"Now our little map keeps the addresses straight.\" Celeste: \"Two careful observations, one clear picture.\" Your finished original paper map stays with you for this visit.",
    },
    end_session: {
      ended: "Historical walk ended. Your afternoon continues.",
    },
    walk_route: {
      already: "Already at this outdoor stop. Choose Record site or Share map.",
    },
    blocked_route: {
      blocked: "The walk paused before arrival. Your map stays. Return to Eddy Street and choose Walk again.",
    },
    source_text: {
      unavailable: "Historical source unavailable.",
      head: "HISTORICAL: November 5, 2024 consolidated election, including Mayor. Two entries from the City's October 3 published list; later relocations unverified.\nSELECTED: ",
      eas: ". City EAS ",
      tail: " address pin, not a surveyed entrance or room. The orange square is an outdoor game observation stop. North is up; scale bar 40m. Pins 1 and 2 are city address points, not doors.\nADDRESS NOTE: the existing museum scene says 398 Eddy; this polling row says Cadillac Hotel, 380 Eddy, Lobby. The park scene says 240 Eddy; its separate polling row says 246 Eddy, Meeting Room. Neither scene's entrance is a polling-door claim.\nOther entries in our retained excerpt: Faithful Fools, 234 Hyde; Glide, 330 Ellis, 2nd Floor Sanctuary. They are outside this two-stop walk. This is not a complete list or an assigned voting site. For present-day voting, consult current San Francisco Department of Elections information. The world uses the existing dated geography model, not a 2024 streetscape reconstruction. Original fictional map-making and dialogue; no real ballot, endorsement or vote.",
    },
    refresh: {
      heading: "Election Walk 2024 | ",
      shared: "Shared!",
      place: "Place the labels",
      shareBea: "Share with Bea",
      observed: "%d/2 sites observed",
      returnBea: "Return to Bea",
      walkSite: "Walk to site",
      musicOn: "Music: On",
      musicOff: "Music: Off",
      pin: "Map pin %d: city address point",
    },
    objective: {
      home: "Bea's gathering",
      prefix: "Election Walk: ",
      won: "Map shared!",
      place: "Place two labels on your paper map",
      return: "Return and share your map",
      observe: "Observe ",
      hint: "Election map resumes this historical visit. Back keeps it; End clears it.",
    },
  },
  'main.gd': {
    inspect_neighborhood_surprise: {
      badge: "Neighborhood Discovery",
      speaker: "Neighbor",
      all: "All 10/10 Keepsakes!",
      tag: "%d/%d Surprises",
      burst: "%s · Sparks: %d · %s",
      burstKeepsake: "%s · Sparks: %d · Keepsake: %s",
      finale: "10/10 Surprises: %s",
      found: "Surprise Found: %s",
      memory: "%s: \"%s\"",
      line: "%s — %s (%d/%d Surprises Found)",
      keepsake: " · Keepsake: %s",
      sub: "%s: \"%s\" · %s%s (Shift+D for next surprise)",
      info: "%s\n%s\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL",
      announce: "%s%s. %s says: %s",
    },
    current_objective: {
      spot: "Spot %s (%d/%d surprises, Shift+D) · Museum (Shift+M)",
      spotHint: "Take your time. Spot the %d neighborhood surprises (%d/%d found, Shift+D)—next is %s (%s at %s)—or try the museum's Time-Portal on Eddy and the eateries along Turk.",
      tour: "Tour %d/%d this session: %s",
      tourHint: "All 10 keepsakes are yours! Optional tour: %s, %s. %d/%d stops this session; tour progress starts fresh on reload. Ask a neighbor to show you the stop, or follow the gold marker.",
      done: "All 10 keepsakes found! Tour %d/%d this session complete!",
      doneHint: "You've visited all %d tour stops this session and found every keepsake! Wander freely, revisit the museum (Shift+M), or switch to evening lights (Shift+L). The optional tour starts fresh on reload.",
    },
    update_objective_ui: {
      progress: "Sparks: %d · Keepsakes: %d/10",
    },
    ask_whats_next: {
      pair: "Have you spotted %s yet? Look %s at %s (%d/%d surprises found, Shift+D).",
      next: "You found both of my favorite block surprises! Next, check out %s %s at %s (%d/%d found, Shift+D).",
    },
    conversation_actions: {
      spot: "Spot Surprise (%d/%d)",
    },
    landmark_tour_state: {
      museumAction: "Visit the Museum",
      park: "Boeddeker Park",
      parkAction: "Visit the Park",
      soWhat: "'So What' Easter Egg",
      soWhatAction: "See 'So What'",
      eatery: "%s (fictional)",
      eateryAction: "Order at Next Stop",
    },
    update_landmark_tour_completion: {
      cue: "All %d session stops",
      announce: "Neighborhood Tour Complete! All %d stops visited this session. You found all 10 keepsakes; the optional tour starts fresh next session.",
    },
    inspect_boeddeker_park: {
      title: "Boeddeker Park",
      line: "Boeddeker Park — 240 Eddy St at Jones (OpenStreetMap way %d)",
      sub: "Fenced neighborhood park: lawn, %d shade trees, play structure & benches along a winding path · Outline © OpenStreetMap / ODbL; trees, path & furniture are stylized, not surveyed",
      info: "%s\n%s\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL",
      announce: "%s: %s",
    },
    inspect_so_what_easter_egg: {
      title: "So What",
      line: "145 Leavenworth (8th Floor) & 361 Turk St — 'So What' Musical Awning Easter Egg",
      sub: "Dual-address Tenderloin complex (footprints 201006.0001527 & 201006.0003855) · Entrance awning arranged after Miles Davis's 'So What' (Live at the Black Hawk, 1961)",
      info: "%s\n%s\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL",
      announce: "%s: %s",
    },
    update_museum_portal_3d: {
      present: "7be0e6",
      jazzEra: "1961_jazz",
      jazz: "f3c458",
      comptonsEra: "1966_comptons",
      comptons: "d884b8",
      cadillacEra: "1907_cadillac",
      cadillac: "5ec2c6",
    },
    inspect_tenderloin_museum_hub: {
      title0: "398 Eddy St Info Hub",
      era0: "present",
      title0b: "398 Eddy St Info Hub",
      line0: "Tenderloin Museum & Central Info Hub — 398 Eddy St (Cadillac Hotel, 1907)",
      sub0: "Cultural center & adventure base (footprint 201006.0001559) · Offers walking tours, live performances & the Living Archive Time-Portal (press Shift+M again to channel past eras!)",
      era1: "1961_jazz",
      title1: "1961 Black Hawk Jazz Era",
      line1: "Tenderloin Museum Time-Portal » 1961: Black Hawk & 'So What' Jazz Era",
      sub1: "Archive Portal tuned to April 1961 · Miles Davis sextet live at Turk & Hyde + the 145 Leavenworth / 361 Turk 'So What' brass-and-teal canopy!",
      era2: "1966_comptons",
      title2: "1966 Compton's Neon",
      line2: "Tenderloin Museum Time-Portal » 1966: Compton's Cafeteria Midnight Neon",
      sub2: "Archive Portal tuned to August 1966 · Late-night jukebox, coffee cups & neon solidarity at Taylor & Turk in the heart of the Tenderloin.",
      era3: "1907_cadillac",
      title3: "1907 Cadillac Hotel",
      line3: "Tenderloin Museum Time-Portal » 1907: Cadillac Hotel & Great White Way",
      sub3: "Archive Portal tuned to 1907 · Grand reopening of the 4-story Cadillac Hotel at Eddy & Leavenworth with theater-district marquees and supper clubs.",
      info: "%s\n%s\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL",
      announce: "%s: %s",
    },
    cycle_eatery_guide: {
      welcome: "Welcome in!",
      line: "%s — %s (fictional)",
      sub: "%s · Specialty: %s (Stop %d/%d · Tap the counter to order · Shift+E for next fictionalized spot)",
      info: "%s\n%s\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL",
      announce: "%s: %s",
    },
    eatery_counter_interact: {
      welcome: "Welcome in!",
      special: "house special",
      burst: "Order Up: %s",
      burstSub: "%s · Sparks: %d",
      message: "Ordering at %s: %s (tap the counter again for more)",
      info: "%s\nHost: \"%s\"\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL",
      announce: "%s. Host says: %s",
    },
    show_eatery_host_speech: {
      speech: "%s (fictional)\n%s",
    },
  },
};
// Godot literal -> 2D wording. Only the 3D edition's key and control hints (F8, Shift F8, Shift+D,
// Shift+E, Shift+M, Shift+L) are dropped or renamed; every other word stays verbatim.
export const WEB_OVERRIDES = {
  'story_picker.gd': {
    "Switch stories without losing this visit's choices. Travel stops; only your chosen story is shown. End clears that story's play state; reload clears all visits and invitations. F8 resumes your active story, or a paused Power visit; Shift F8 opens these choices.":
      "Switch stories without losing this visit's choices. Travel stops; only your chosen story is shown. End clears that story's play state; reload clears all visits and invitations.",
    "Other story visits. Keep this visit's progress. Shift F8.":
      "Other story visits. Keep this visit's progress.",
  },
  'power_story.gd': {
    "Neighborhood Stories: resume F8; switch story visits Shift F8":
      "Neighborhood Stories",
  },
  'main.gd': {
    "%s: \"%s\" · %s%s (Shift+D for next surprise)":
      "%s: \"%s\" · %s%s",
    "Spot %s (%d/%d surprises, Shift+D) · Museum (Shift+M)":
      "Spot %s (%d/%d surprises) · Museum",
    "Take your time. Spot the %d neighborhood surprises (%d/%d found, Shift+D)—next is %s (%s at %s)—or try the museum's Time-Portal on Eddy and the eateries along Turk.":
      "Take your time. Spot the %d neighborhood surprises (%d/%d found)—next is %s (%s at %s)—or try the museum's Time-Portal on Eddy and the eateries along Turk.",
    "You've visited all %d tour stops this session and found every keepsake! Wander freely, revisit the museum (Shift+M), or switch to evening lights (Shift+L). The optional tour starts fresh on reload.":
      "You've visited all %d tour stops this session and found every keepsake! Wander freely, revisit the museum, or switch to evening lights. The optional tour starts fresh on reload.",
    "Have you spotted %s yet? Look %s at %s (%d/%d surprises found, Shift+D).":
      "Have you spotted %s yet? Look %s at %s (%d/%d surprises found).",
    "You found both of my favorite block surprises! Next, check out %s %s at %s (%d/%d found, Shift+D).":
      "You found both of my favorite block surprises! Next, check out %s %s at %s (%d/%d found).",
    "Cultural center & adventure base (footprint 201006.0001559) · Offers walking tours, live performances & the Living Archive Time-Portal (press Shift+M again to channel past eras!)":
      "Cultural center & adventure base (footprint 201006.0001559) · Offers walking tours, live performances & the Living Archive Time-Portal (choose Next era to channel past eras!)",
    "%s · Specialty: %s (Stop %d/%d · Tap the counter to order · Shift+E for next fictionalized spot)":
      "%s · Specialty: %s (Stop %d/%d · Tap the counter to order)",
  },
};
// A Godot literal as the 2D fork shows it: its override when one is declared, else verbatim.
export function web(file, literal) {
  const map = WEB_OVERRIDES[file];
  return map && Object.hasOwn(map, literal) ? map[literal] : literal;
}
