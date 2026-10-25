extends RefCounted
## Original fictional cooks; factual recipe abstractions, not complete cooking instructions.
const RECIPES := [
	{
		"id":"kibbeh", "cook":"Nura", "title":"Kibbeh bil sanieh", "tradition":"Syrian Arab layered kibbeh pie",
		"welcome":"I am Nura. I came from Syria as a refugee, and I fix bicycles. Today I am making a layered kibbeh pie. Come press the base with me; we can talk while our hands are busy.",
		"ingredients":"Fine bulgur and lean meat dough; browned meat, onion, spices and nuts between the layers.",
		"source":"Recipe context: Ghinwa Alameen, Syrian Cooking, kibbeh bil sanieh and basic kibbeh dough. One documented version; families vary.",
		"url":"https://www.syriancooking.com/2010/09/08/kibbeh-bil-sanieh-kibbeh-pie/",
		"steps":[
			["Prepare the bulgur dough","Moistened fine bulgur, lean meat and onion become the outer layers. We are making the baked pie version."],
			["Brown the filling","Cook the meat and onion, add the spices and nuts, then let the filling cool a little."],
			["Press base and add filling","Press an even base into the tray and spread the cooked filling over it."],
			["Cover and score diamonds","Cover with the remaining dough. Score the diamond pattern gently; keep the filling inside."],
			["Bake until golden","The covered layers bake through and the top browns. Our stylized kitchen advances without a real cooking timer."]
		],
		"recognition":["You kept the filling between those even layers. I will bring the big tray over; everyone can choose a diamond.","Those little tasting plates make room for somebody who only has a minute. I will cut the pie along your diamond lines."],
		"invite":"Mei has a daikon cake setting nearby. I think you would enjoy making the crisp edges with her."
	},
	{
		"id":"lobakgo", "cook":"Mei", "title":"Lo bak go", "tradition":"Cantonese daikon cake",
		"welcome":"I am Mei, a Cantonese American neighbor. I like plenty of daikon in my lo bak go. My other project today is convincing Nura to help mend my rattling kitchen trolley.",
		"ingredients":"Daikon; regular rice flour and cornstarch; dried shrimp, mushrooms, Chinese sausage and scallion.",
		"source":"Recipe context: Bill Leung, adapted from his sister Ginny's family version, The Woks of Life. Regular rice flour, not glutinous rice flour.",
		"url":"https://thewoksoflife.com/turnip-cake-lo-bak-go/",
		"steps":[
			["Grate the daikon","The pale strands are daikon. The cake is named for the radish, not a sweet cake batter."],
			["Cook the savory filling","Cook the shrimp, mushrooms and sausage with scallion; set them aside while the daikon softens."],
			["Mix the rice-flour batter","Combine the softened daikon, regular rice-flour mixture and savory filling."],
			["Steam and let it set","Steam the batter, then let it cool and set before slicing. These steps are condensed here, without a timer."],
			["Slice and pan-fry","Cut the set cake into slices and brown both faces. Pale centers and crisp golden edges belong together."]
		],
		"recognition":["Look at those crisp edges around the daikon centers. Put the slices together on that platter; I will find the serving tongs.","Two small tasting plates? Good idea. Someone can try a slice and come back for another without making a speech."],
		"invite":"Mali has her mortar out. She offered to show us her beef pad kra pao after we finish here."
	},
	{
		"id":"krapao", "cook":"Mali", "title":"Beef pad kra pao", "tradition":"Thai holy-basil stir-fry",
		"welcome":"I am Mali. I am Thai, and an enthusiastic balcony gardener. The holy basil gets my last patch of sunlight. I want its leaves fragrant, so they go in after the heat is off.",
		"ingredients":"Beef, garlic and chilies; fish sauce, a little sugar and stock; holy basil. Jasmine rice and an egg for serving.",
		"source":"Recipe context: Pailin Chongchitnant, Hot Thai Kitchen, the specific beef version. Its browning order differs from some other versions.",
		"url":"https://hot-thai-kitchen.com/pad-kra-pao-beef/",
		"steps":[
			["Pound chili and garlic","Use the mortar to crush the chili and garlic into a rough aromatic mixture."],
			["Brown the beef","In this documented beef version, brown the beef before adding the aromatic mixture."],
			["Toss in the aromatics","Make room in the pan for the garlic and chili mixture, then toss it with the beef."],
			["Season, then turn heat off","Add the sauce, stock and peppers. Finish the hot cooking before the basil goes in."],
			["Fold in holy basil","Fold the leaves through the residual warmth. Serve the basil-flecked beef beside jasmine rice and an egg."]
		],
		"recognition":["You saved the leaves for the end. I can see them through the beef instead of losing them in the pan. Let us carry the platter together.","Those tasting plates leave a bright patch of rice beside the basil. I will put the condiments to one side so people can choose."],
		"invite":"Grace is ready to fluff her red rice. She asked if we could bring our serving spoons over."
	},
	{
		"id":"redrice", "cook":"Grace", "title":"Gullah Geechee red rice", "tradition":"African American Lowcountry foodways",
		"welcome":"I am Grace, an African American neighbor with family ties to the South Carolina Lowcountry. I am also the person borrowing everybody's plant cuttings. Bring a serving spoon; there will be room for all our dishes.",
		"ingredients":"Parboiled rice, smoked pork sausage, onion, bell pepper and tomato paste, with seasonings.",
		"source":"Recipe context: Kardea Brown's Gullah red rice. This is one family version of a living African American food tradition, not every family's recipe.",
		"url":"https://kardeabrown.com/gullah-red-rice/",
		"steps":[
			["Rinse the parboiled rice","Start with parboiled rice and rinse it. The grains will take on the tomato mixture."],
			["Cook sausage and vegetables","Cook the diced smoked sausage, onion and bell pepper until the vegetables soften."],
			["Coat the rice with tomato","Stir in the tomato paste and seasonings, then coat the rice in that mixture."],
			["Cover and bake","Add water, cover the baking dish and let the rice cook. Our untimed kitchen condenses the real waiting."],
			["Fluff and let it rest","Fluff the cooked rice, then cover it for its final rest. Now the red grains can share the table."]
		],
		"recognition":["There are the separate red grains I was looking for. Bring the serving pan; I want a seat where I can hear everybody.","I like these little plates. They leave room to taste what the other cooks brought. Save one for me while I pass the spoons."],
		"invite":"We have a meal to sit down with. Nura said she would happily cook beside you again whenever you return."
	}
]
