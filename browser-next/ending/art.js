// The ending art, ported from Godot SVG builders. GODOT_ART holds every string literal of each builder in source
// order, copied verbatim; tests/next-ending.test.mjs compares it with godot/*.gd, so a changed path or colour fails.
// The builders use these literals by index exactly where Godot does, with gdf() for Godot % formatting.
export const GODOT_ART = {
  "mural_stories.gd": {
    vignette: [
      "#294f44",
      "<circle cx=\"77\" cy=\"47\" r=\"17\" fill=\"#aa6549\"/><path d=\"M60 43Q56 22 78 25Q96 24 94 44L86 34L62 38Z\" fill=\"%s\"/><path d=\"M82 47h2M85 54q-6 4-10 0\" fill=\"none\" stroke=\"%s\" stroke-width=\"2\"/>",
      "",
      "cooking",
      "<path d=\"M28 184Q23 158 43 154L169 157Q182 175 168 186Z\" fill=\"%s\" opacity=\".2\"/>",
      "<path d=\"M58 70Q75 60 94 71L104 132H47Z\" fill=\"%s\"/><path d=\"M67 69L68 88H85L88 69M66 88L57 136H94L86 88Z\" fill=\"#f4e3ba\" stroke=\"%s\" stroke-width=\"3\"/><path d=\"M54 130L54 174M87 132L90 176\" stroke=\"%s\" stroke-width=\"13\" stroke-linecap=\"round\"/><path d=\"M54 174H42M90 176H104\" stroke=\"%s\" stroke-width=\"7\" stroke-linecap=\"round\"/>",
      "<path d=\"M57 78L39 109L64 117M92 78L115 94L143 76\" fill=\"none\" stroke=\"#aa6549\" stroke-width=\"10\" stroke-linecap=\"round\"/><path d=\"M140 72L156 118\" stroke=\"%s\" stroke-width=\"4\"/><ellipse cx=\"157\" cy=\"120\" rx=\"6\" ry=\"9\" fill=\"%s\" transform=\"rotate(-20 157 120)\"/>",
      "<path d=\"M105 127H183L175 153H113Z\" fill=\"%s\" stroke=\"%s\" stroke-width=\"3\"/><ellipse cx=\"144\" cy=\"127\" rx=\"39\" ry=\"7\" fill=\"%s\" stroke=\"%s\" stroke-width=\"3\"/><path d=\"M102 134H96M183 134H190M126 111Q114 101 126 88M147 112Q138 101 149 92M168 113Q160 103 171 92\" fill=\"none\" stroke=\"%s\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M96 157H190M103 157V185M183 157V185\" stroke=\"%s\" stroke-width=\"5\"/><path d=\"M113 120L120 115L125 122M145 121L151 117L158 123\" fill=\"%s\"/>",
      "sharing",
      "<path d=\"M19 184Q12 165 36 157H178Q198 172 181 185Z\" fill=\"%s\" opacity=\".2\"/>",
      "<circle cx=\"44\" cy=\"53\" r=\"16\" fill=\"#aa6549\"/><path d=\"M28 50Q20 25 45 29Q65 29 62 50L52 40L29 44Z\" fill=\"%s\"/><circle cx=\"161\" cy=\"54\" r=\"16\" fill=\"#71452f\"/><path d=\"M146 46Q145 28 164 29Q187 32 178 60L170 41Z\" fill=\"%s\"/>",
      "<path d=\"M28 77Q43 66 61 79L68 134H22Z\" fill=\"%s\"/><path d=\"M144 78Q161 67 176 81L183 137H139Z\" fill=\"%s\"/><path d=\"M30 133L26 179M58 133L61 179M148 136L145 179M172 136L177 179\" stroke=\"%s\" stroke-width=\"11\" stroke-linecap=\"round\"/>",
      "<path d=\"M58 82L82 105L113 105\" fill=\"none\" stroke=\"#aa6549\" stroke-width=\"9\" stroke-linecap=\"round\"/><path d=\"M145 84L127 118L103 116\" fill=\"none\" stroke=\"#71452f\" stroke-width=\"9\" stroke-linecap=\"round\"/><path d=\"M89 101H122Q118 118 105 118Q93 117 89 101Z\" fill=\"%s\" stroke=\"%s\" stroke-width=\"3\"/><path d=\"M97 94Q90 86 97 79M110 94Q103 86 111 79\" fill=\"none\" stroke=\"%s\" stroke-width=\"2.5\" stroke-linecap=\"round\"/><path d=\"M64 139H141M72 139V183M134 139V183\" fill=\"none\" stroke=\"%s\" stroke-width=\"5\"/><ellipse cx=\"103\" cy=\"137\" rx=\"26\" ry=\"5\" fill=\"%s\"/>",
      "painting",
      "<path d=\"M18 185Q12 167 30 163H183L186 186Z\" fill=\"%s\" opacity=\".2\"/>",
      "<path d=\"M93 34L189 27L185 148L91 153Z\" fill=\"#ecd4aa\" stroke=\"%s\" stroke-width=\"3\"/><path d=\"M104 61Q142 20 176 59M106 109Q125 71 169 88M111 129Q141 97 174 121\" fill=\"none\" stroke=\"%s\" stroke-width=\"13\" stroke-linecap=\"round\"/><path d=\"M106 69Q141 38 174 65M108 116Q134 85 173 97\" fill=\"none\" stroke=\"%s\" stroke-width=\"6\" stroke-linecap=\"round\"/><path d=\"M101 152L96 182M177 150L185 181\" stroke=\"%s\" stroke-width=\"5\"/>",
      "<circle cx=\"51\" cy=\"54\" r=\"16\" fill=\"#71452f\"/><path d=\"M35 48Q31 29 53 31Q70 31 68 49L59 40L36 43Z\" fill=\"%s\"/><path d=\"M31 78Q46 68 62 78L71 129H25Z\" fill=\"%s\"/><path d=\"M32 128L27 178M61 128L69 178\" stroke=\"%s\" stroke-width=\"12\" stroke-linecap=\"round\"/><path d=\"M27 178H15M69 178H81\" stroke=\"%s\" stroke-width=\"7\" stroke-linecap=\"round\"/>",
      "<path d=\"M61 82L79 99L105 75M33 84L18 110L39 122\" fill=\"none\" stroke=\"#71452f\" stroke-width=\"9\" stroke-linecap=\"round\"/><path d=\"M101 69L108 66L114 85L105 88Z\" fill=\"%s\" stroke=\"%s\" stroke-width=\"2\"/><path d=\"M106 65L110 63\" stroke=\"%s\" stroke-width=\"3\"/><g fill=\"%s\"><circle cx=\"118\" cy=\"59\" r=\"2\"/><circle cx=\"126\" cy=\"56\" r=\"2.6\"/><circle cx=\"126\" cy=\"64\" r=\"1.8\"/><circle cx=\"133\" cy=\"61\" r=\"2\"/></g><path d=\"M39 126L45 119L50 124L45 134Z\" fill=\"%s\"/>",
      "music",
      "<path d=\"M18 184Q12 163 39 159L173 163Q194 174 179 187Z\" fill=\"%s\" opacity=\".2\"/>",
      "<path d=\"M46 133H116M52 133L43 180M109 133L120 180\" fill=\"none\" stroke=\"%s\" stroke-width=\"6\"/>",
      "<path d=\"M57 70Q76 62 94 73L105 124L61 133L45 106Z\" fill=\"%s\"/><path d=\"M61 128L91 142L86 177M94 125L119 138L132 172\" fill=\"none\" stroke=\"%s\" stroke-width=\"13\" stroke-linecap=\"round\"/><path d=\"M86 177H72M132 172L144 169\" stroke=\"%s\" stroke-width=\"7\" stroke-linecap=\"round\"/>",
      "<path d=\"M90 91Q70 82 66 104Q60 113 74 121Q66 144 90 148Q111 153 119 135Q133 127 119 114L114 107Z\" fill=\"%s\" stroke=\"%s\" stroke-width=\"3\"/><path d=\"M105 110L164 72L171 81L114 121Z\" fill=\"#bd8152\" stroke=\"%s\" stroke-width=\"3\"/><path d=\"M158 72L173 63L181 77L167 86Z\" fill=\"%s\" stroke=\"%s\" stroke-width=\"3\"/><circle cx=\"98\" cy=\"121\" r=\"9\" fill=\"%s\"/><path d=\"M86 139L83 132M86 134L172 74M88 136L173 76M90 138L174 78\" stroke=\"#f4e3ba\" stroke-width=\"1.5\"/><path d=\"M54 82L51 106L88 123M92 80L121 97L143 92\" fill=\"none\" stroke=\"#aa6549\" stroke-width=\"9\" stroke-linecap=\"round\"/><path d=\"M147 43v17q-10-4-10 3t13-1V40l19-5v19q-10-4-10 3t13-1V31Z\" fill=\"%s\"/>",
      "garden",
      "<path d=\"M12 184Q14 163 38 160H178Q200 173 182 187Z\" fill=\"%s\" opacity=\".2\"/>",
      "<circle cx=\"39\" cy=\"55\" r=\"16\" fill=\"#71452f\"/><path d=\"M23 50Q18 30 40 30Q61 31 56 51L46 40L24 45Z\" fill=\"%s\"/><path d=\"M21 78Q38 66 56 78L64 127H17Z\" fill=\"%s\"/><path d=\"M26 126L23 177M51 127L62 176\" stroke=\"%s\" stroke-width=\"12\" stroke-linecap=\"round\"/>",
      "<circle cx=\"163\" cy=\"65\" r=\"16\" fill=\"#aa6549\"/><path d=\"M147 60Q139 36 164 39Q184 40 180 64L171 48L148 53Z\" fill=\"%s\"/><path d=\"M146 87Q161 75 179 88L185 137L143 145Z\" fill=\"%s\"/><path d=\"M150 140L133 162L153 178M177 136L178 175\" fill=\"none\" stroke=\"%s\" stroke-width=\"12\" stroke-linecap=\"round\"/>",
      "<path d=\"M64 137L141 135L135 173L71 174Z\" fill=\"#b97952\" stroke=\"%s\" stroke-width=\"3\"/><path d=\"M60 132H145V142H60Z\" fill=\"%s\" stroke=\"%s\" stroke-width=\"3\"/><path d=\"M84 130V109M107 131V94M127 131V111\" fill=\"none\" stroke=\"%s\" stroke-width=\"3\"/><path d=\"M84 118Q64 118 69 106Q83 100 84 118M84 114Q82 99 96 100Q102 113 84 114M107 112Q88 110 92 98Q106 93 107 112M108 104Q109 84 124 91Q130 104 108 104M127 123Q115 111 125 105Q139 108 127 123M127 119Q132 104 144 112Q147 125 127 119Z\" fill=\"%s\"/>",
      "<path d=\"M52 84L68 99L84 96M148 96L135 113L119 123\" fill=\"none\" stroke=\"#aa6549\" stroke-width=\"9\" stroke-linecap=\"round\"/><path d=\"M60 99L85 95L91 116L67 122Z\" fill=\"%s\" stroke=\"%s\" stroke-width=\"3\"/><path d=\"M67 103Q53 91 57 107L66 113M86 104L99 108L98 113L88 113M99 116L102 124M104 115L108 122M112 125L117 118L121 126Z\" fill=\"none\" stroke=\"%s\" stroke-width=\"3\" stroke-linecap=\"round\"/>",
      "<g stroke-linejoin=\"round\">",
      "</g>",
    ],
    svg: [
      "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"600\" height=\"300\" viewBox=\"0 0 600 300\"><rect width=\"600\" height=\"300\" rx=\"8\" fill=\"#f4e3ba\"/><path d=\"M13 239Q129 208 289 239T587 225L587 284H13Z\" fill=\"%s\" opacity=\".12\"/><path d=\"M14 28Q146 10 283 27M326 20Q462 4 584 25\" fill=\"none\" stroke=\"#fff3d5\" stroke-width=\"10\" opacity=\".7\"/>",
      "<path d=\"M%d 8v284\" stroke=\"#a78056\" stroke-width=\".5\" opacity=\".09\"/>",
      "<g transform=\"translate(%d 10) scale(1.3)\">%s</g>",
      "left",
      "</svg>",
    ],
    thumbnail: [
      "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"200\" height=\"200\" viewBox=\"0 0 200 200\">",
      "</svg>",
    ],
  },
  "mural_signature.gd": {
    svg: [
      "<path d=\"M12 17H43L57 9V29L43 21H19Q10 21 10 13V9H16M23 17V10M31 17V8M39 17V10M22 12H26M30 10H34M38 12H42\"/>",
      "<path d=\"M23 8L27 27H43L47 8M25 13L43 23M45 13L28 23\"/><ellipse cx=\"35\" cy=\"8\" rx=\"13\" ry=\"4\"/><path d=\"M18 2L27 5M43 4L52 1\"/>",
      "<path d=\"M20 12H45L42 25H24ZM45 14Q58 12 52 21H44M17 29H49M27 9Q22 5 28 1M38 9Q33 5 39 1\"/>",
      "<path d=\"M35 28C27 22 16 14 20 7C24 0 32 3 35 9C38 3 46 0 50 7C54 14 43 23 35 28Z\"/>",
      "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"%d\" height=\"%d\" viewBox=\"0 0 %d %d\"><rect width=\"100%%\" height=\"100%%\" fill=\"#f4e3ba\"/>",
      "translate(0 %d)",
      "translate(%d 0)",
      "<g transform=\"%s\" fill=\"none\" stroke=\"#294f44\" stroke-width=\"2.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\">%s</g>",
      "<g transform=\"%s\" fill=\"none\" stroke=\"%s\" stroke-width=\"1.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\">%s</g>",
      "</svg>",
    ],
  },
  "bea_invitation.gd": {
    source: [
      "",
      "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"360\" height=\"240\" viewBox=\"0 0 360 240\"><rect width=\"360\" height=\"240\" fill=\"#f5e7cb\"/><path d=\"M10 20 Q170 9 350 18 M16 222 Q190 230 344 216\" fill=\"none\" stroke=\"#d8bf96\" stroke-width=\"3\"/>",
      "memory",
      "<path d=\"M18 240 L44 95 Q67 63 116 60 L266 63 Q302 84 333 240Z\" fill=\"#386e79\"/><path d=\"M65 112 Q174 137 289 108 L278 240 H80Z\" fill=\"#29525e\"/><path d=\"M75 128 Q173 152 281 125\" stroke=\"#e0ae68\" stroke-width=\"3\" stroke-dasharray=\"5 5\" fill=\"none\"/><g transform=\"rotate(-8 180 100)\"><path d=\"M110 34 L252 43 L242 147 L106 134Z\" fill=\"#fff5dd\" stroke=\"#bd8b65\" stroke-width=\"3\"/><path d=\"M110 34 L171 91 L252 43 M171 91 L109 134 M171 91 L242 147\" stroke=\"#d8b990\" stroke-width=\"3\" fill=\"none\"/><path d=\"M165 75 C152 58 134 72 165 96 C196 72 178 58 165 75\" fill=\"#c36b62\"/></g><path d=\"M54 51 Q68 37 83 50 M286 48 L298 32 M305 64 L324 59\" fill=\"none\" stroke=\"#d5a44f\" stroke-width=\"5\" stroke-linecap=\"round\"/>",
      "<path d=\"M20 69 Q178 117 340 58\" fill=\"none\" stroke=\"#38596c\" stroke-width=\"5\"/><path d=\"M48 78 L107 91 L69 155Z\" fill=\"#d68468\"/><path d=\"M128 96 L188 98 L160 170Z\" fill=\"#6a9a8c\"/><path d=\"M213 94 L271 81 L259 156Z\" fill=\"#a194ba\"/><path d=\"M291 74 L335 60 L330 128Z\" fill=\"#fff5dd\" stroke=\"#c4b18d\" stroke-width=\"2\"/><path d=\"M0 216 L80 158 L111 170 L59 240 H0Z\" fill=\"#38596c\"/><path d=\"M64 173 Q92 139 113 139 L136 132 Q151 134 143 146 L113 161 L124 166 Q142 162 145 173 Q144 187 119 194 L89 201Z\" fill=\"#b77f5d\"/><path d=\"M360 211 L293 159 L263 177 L310 240 H360Z\" fill=\"#a194ba\"/><path d=\"M299 171 Q285 141 269 135 L245 123 Q231 124 236 138 L261 155 L247 153 Q233 157 240 169 L268 191Z\" fill=\"#e0b18b\"/><path d=\"M182 35 L182 51 M166 43 L174 53 M198 43 L190 53\" stroke=\"#d5a44f\" stroke-width=\"4\" stroke-linecap=\"round\"/>",
      "</svg>",
    ],
  },
  "programme_studio.gd": {
    artwork: [
      "stories",
      "e5b66d",
      "beats",
      "91bac2",
      "art",
      "d9a2b2",
      "pause",
      "a3b48c",
      "stories",
      "<path d=\"M10 10Q35 0 60 12Q85 0 110 10V78Q85 68 60 80Q35 68 10 78ZM60 12V80\" fill=\"#fff4dc\" stroke=\"#38594e\" stroke-width=\"5\"/>",
      "beats",
      "<ellipse cx=\"60\" cy=\"25\" rx=\"45\" ry=\"18\" fill=\"#fff4dc\" stroke=\"#38594e\" stroke-width=\"5\"/><path d=\"M15 25L30 85Q60 102 90 85L105 25M35 40L85 83M85 40L35 83\" fill=\"none\" stroke=\"#38594e\" stroke-width=\"5\"/>",
      "art",
      "<path d=\"M12 55Q0 5 60 4Q120 4 110 55Q110 85 70 83Q60 78 70 65Q68 49 50 55Q30 80 12 55\" fill=\"#fff4dc\" stroke=\"#38594e\" stroke-width=\"5\"/><circle cx=\"30\" cy=\"28\" r=\"7\" fill=\"#c88268\"/><circle cx=\"60\" cy=\"18\" r=\"7\" fill=\"#6b9c8b\"/><circle cx=\"90\" cy=\"33\" r=\"7\" fill=\"#ad7ca0\"/>",
      "pause",
      "<path d=\"M30 82V42H85V82M22 42H95M35 82V100M80 82V100\" fill=\"none\" stroke=\"#38594e\" stroke-width=\"7\"/><path d=\"M50 25Q55 3 85 7Q80 30 50 25\" fill=\"#fff4dc\"/>",
      "",
      "",
      "d5c4a5",
      "<g transform=\"translate(65 %d)\"><path d=\"M0 0L590 3 586 86 4 88Z\" fill=\"#%s\"/><path d=\"M135 24Q300 17 530 26M140 47L460 45M140 67Q350 61 510 66\" fill=\"none\" stroke=\"#fff4dc\" stroke-width=\"6\" opacity=\".55\"/><circle cx=\"12\" cy=\"10\" r=\"7\" fill=\"#b46f50\"/><g transform=\"translate(12 -1) scale(.85)\">%s</g></g>",
      "",
      "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"720\" height=\"480\" viewBox=\"0 0 720 480\"><rect width=\"720\" height=\"480\" rx=\"16\" fill=\"#a47e54\"/><path d=\"M25 25L700 20 693 459 20 452Z\" fill=\"#edddb8\"/><path d=\"M40 31H680M42 446H673\" stroke=\"#d3bb8b\" stroke-width=\"5\"/>%s</svg>",
    ],
  },
  "helper_bench.gd": {
    texture: [
      "%d:%s:%s:%s:%s",
      "<rect width=\"720\" height=\"480\" rx=\"20\" fill=\"#e6dcc0\"/><path d=\"M24 450H696\" stroke=\"#9d8769\" stroke-width=\"8\"/><rect x=\"100\" y=\"420\" width=\"310\" height=\"25\" rx=\"8\" fill=\"#406d73\"/>",
      "<path d=\"M%d 420L%d %dL%d %dL%d 420Z\" fill=\"#c07e47\" stroke=\"#654835\" stroke-width=\"5\"/>",
      "<rect x=\"%d\" y=\"%d\" width=\"48\" height=\"%d\" rx=\"12\" fill=\"none\" stroke=\"#a68a64\" stroke-width=\"5\" stroke-dasharray=\"10 8\"/>",
      "<rect x=\"%d\" y=\"%d\" width=\"%f\" height=\"%f\" rx=\"5\" fill=\"#29434a\"/>",
      "<g transform=\"translate(%d %d) scale(%f %f)\">%s</g>",
      "<circle cx=\"%d\" cy=\"434\" r=\"23\" fill=\"#29434a\"/><circle cx=\"%d\" cy=\"434\" r=\"23\" fill=\"#29434a\"/><rect x=\"%d\" y=\"344\" width=\"96\" height=\"72\" rx=\"20\" fill=\"#da9e49\" stroke=\"#29434a\" stroke-width=\"6\"/><rect x=\"%d\" y=\"316\" width=\"74\" height=\"44\" rx=\"17\" fill=\"#5f9c92\" stroke=\"#29434a\" stroke-width=\"6\"/><circle cx=\"%d\" cy=\"337\" r=\"6\" fill=\"#fff2cc\"/><circle cx=\"%d\" cy=\"337\" r=\"6\" fill=\"#fff2cc\"/>",
      "<path d=\"M%d 371L%d %dL%d %d\" stroke=\"#29434a\" stroke-width=\"14\" stroke-linecap=\"round\" fill=\"none\"/>",
      "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"720\" height=\"480\" viewBox=\"0 0 720 480\">",
      "</svg>",
    ],
  },
  "habitat_room.gd": {
    module_svg: [
      "art",
      "film",
      "",
      "<g transform=\"translate(6 %d) scale(.5)\">%s</g>",
      "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"222\" height=\"372\" viewBox=\"0 0 222 372\"><rect width=\"222\" height=\"372\" rx=\"7\" fill=\"#29434a\"/>",
      "</svg>",
      "<rect width=\"360\" height=\"240\" rx=\"20\" fill=\"#e7dcc0\"/>",
      "<ellipse cx=\"180\" cy=\"123\" rx=\"108\" ry=\"82\" fill=\"#b7d0c1\"/>",
      "circle",
      "<rect x=\"102\" y=\"74\" width=\"156\" height=\"65\" rx=\"10\" fill=\"#b88051\" stroke=\"#29434a\" stroke-width=\"5\"/>",
      "arc",
      "<rect x=\"%f\" y=\"%f\" width=\"40\" height=\"38\" rx=\"9\" fill=\"%s\" stroke=\"#29434a\" stroke-width=\"5\"/>",
      "#e8b861",
      "#548b84",
      "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"360\" height=\"240\" viewBox=\"0 0 360 240\">",
      "</svg>",
    ],
    texture: [
      "",
      "<rect width=\"720\" height=\"480\" rx=\"22\" fill=\"#e7dcc0\"/><path d=\"M18 464V18H702V464M318 464H402\" stroke=\"#29434a\" stroke-width=\"14\" fill=\"none\"/><path d=\"M330 470V100H390V470\" fill=\"#f8f0d9\"/><rect x=\"462\" y=\"7\" width=\"140\" height=\"17\" fill=\"#7eb8bc\"/>",
      "",
      "<rect x=\"%f\" y=\"%f\" width=\"256\" height=\"190\" rx=\"14\" fill=\"#29434a\" stroke=\"%s\" stroke-width=\"%d\"/>",
      "#c88436",
      "#687c76",
      "film",
      "film",
      "film",
      "<g transform=\"translate(%f %f) scale(%f)\">%s</g>",
      "<path d=\"M%f %fH%fM%f %fV%f\" stroke=\"#a6b9aa\" stroke-width=\"6\"/>",
      "<rect x=\"%d\" y=\"457\" width=\"20\" height=\"8\" rx=\"3\" fill=\"%s\"/>",
      "#29434a",
      "#c9bea5",
      "<g transform=\"translate(%f %f)\"><circle cx=\"-15\" cy=\"31\" r=\"9\" fill=\"#29434a\"/><circle cx=\"15\" cy=\"31\" r=\"9\" fill=\"#29434a\"/><rect x=\"-25\" y=\"0\" width=\"50\" height=\"38\" rx=\"9\" fill=\"#da9e49\" stroke=\"#29434a\" stroke-width=\"4\"/><rect x=\"-18\" y=\"-17\" width=\"36\" height=\"21\" rx=\"8\" fill=\"#5f9c92\" stroke=\"#29434a\" stroke-width=\"3\"/></g>",
      "<path d=\"M342 425L355 439L381 404\" stroke=\"#29434a\" stroke-width=\"9\" fill=\"none\"/>",
      "room",
      "depart",
      "#496f78",
      "#29434a",
      "#182c38",
      "<rect width=\"720\" height=\"480\" fill=\"%s\"/><ellipse cx=\"360\" cy=\"650\" rx=\"560\" ry=\"265\" fill=\"#7eb8bc\"/><ellipse cx=\"360\" cy=\"683\" rx=\"530\" ry=\"265\" fill=\"#548b84\"/><g transform=\"translate(108 %d) scale(.7)\">",
      "</g>",
      "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"720\" height=\"480\" viewBox=\"0 0 720 480\">",
      "</svg>",
    ],
    links_svg: [
      "<rect x=\"%f\" y=\"%f\" width=\"240\" height=\"158\" rx=\"20\" fill=\"none\" stroke=\"%s\" stroke-width=\"%d\" stroke-dasharray=\"8 4\"/>",
      "#e8b861",
      "#7eb8bc",
      "<g transform=\"translate(%f %f) scale(%f)\">%s</g>",
      "<path d=\"M%f %fL%f %fL%f %fZ\" fill=\"#%s\" stroke=\"#%s\" stroke-width=\"3\"/>",
    ],
  },
};
import { gdf, C } from './text.js';
import { tilePanelSVG } from '../hosting.js';
import { filmFrameSVG } from '../film.js';

const A = GODOT_ART;
export const PAPER_COLORS = C['bea_invitation.gd'].PAPER_COLORS;
export const KEEPSAKE_PALETTE_HEX = C['main.gd'].KEEPSAKE_PALETTE_HEX;
export const SCENE_IDS = C['mural_stories.gd'].IDS, SCENE_SLOTS = C['mural_stories.gd'].SLOTS;
export const escapeXML = text => String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[ch]);

// habitat_room.gd svg_body: one root viewport, so nested drawings keep their outer transforms.
export function svgBody(source) {
  const start = source.indexOf('>') + 1;
  return source.slice(start, source.lastIndexOf('</svg>'));
}
export { tilePanelSVG, filmFrameSVG };

// bea_invitation.gd source(id): the 360x240 invitation for "memory" or "future".
export function beaInvitationSVG(id) {
  const B = A['bea_invitation.gd'].source;
  if (!Object.hasOwn(C['bea_invitation.gd'].TITLES, id)) return B[0];
  return B[1] + (id === B[2] ? B[3] : B[4]) + B[5];
}

// programme_studio.gd artwork(order): the 720x480 pinboard of up to four cards.
export function pinboardSVG(order) {
  const P = A['programme_studio.gd'].artwork;
  const colors = { [P[0]]: P[1], [P[2]]: P[3], [P[4]]: P[5], [P[6]]: P[7] }, glyphs = { [P[8]]: P[9], [P[10]]: P[11], [P[12]]: P[13], [P[14]]: P[15] };
  let ink = P[16];
  for (let i = 0; i < 4; i++) {
    const id = i < order.length ? order[i] : P[17];
    ink += gdf(P[19], 45 + i * 99, Object.hasOwn(colors, id) ? colors[id] : P[18], Object.hasOwn(glyphs, id) ? glyphs[id] : P[20]);
  }
  return gdf(P[21], ink);
}

// habitat_room.gd module_svg(id, c): a copy as the room, the departure and the commons draw it.
export function moduleSVG(id, c) {
  const M = A['habitat_room.gd'].module_svg;
  if (id === M[0]) return tilePanelSVG(c.art);
  if (id === M[1]) {
    let frames = M[2];
    for (let i = 0; i < 3; i++) frames += gdf(M[3], 6 + i * 122, svgBody(filmFrameSVG(c.film, c.film.order[i])));
    return M[4] + frames + M[5];
  }
  let s = M[6];
  s += c.civic.format === M[8] ? M[7] : M[9];
  const positions = c.pause === M[10] ? [[70, 145], [150, 65], [250, 145]] : [[70, 70], [70, 145], [250, 145]];
  for (let i = 0; i < 3; i++) s += gdf(M[11], positions[i][0], positions[i][1], i === 2 ? M[12] : M[13]);
  return M[14] + s + M[15];
}

// mural_stories.gd vignette(id, pal): one scene's silhouettes on a 200x200 tile.
export function vignette(id, pal) {
  const V = A['mural_stories.gd'].vignette, ink = V[0], head = gdf(V[1], ink, ink);
  let art = V[2];
  if (id === V[3]) art = gdf(V[4], pal[0]) + head + gdf(V[5], pal[1], ink, ink, ink) + gdf(V[6], ink, pal[0]) + gdf(V[7], pal[0], ink, pal[2], ink, ink, ink, pal[1]);
  else if (id === V[8]) art = gdf(V[9], pal[1]) + gdf(V[10], ink, ink) + gdf(V[11], pal[1], pal[0], ink) + gdf(V[12], pal[2], ink, ink, ink, pal[0]);
  else if (id === V[13]) art = gdf(V[14], pal[2]) + gdf(V[15], ink, pal[0], pal[1], ink) + gdf(V[16], ink, pal[2], ink, ink) + gdf(V[17], pal[0], ink, ink, pal[1], pal[1]);
  else if (id === V[18]) art = gdf(V[19], pal[1]) + gdf(V[20], ink) + head + gdf(V[21], pal[1], ink, ink) + gdf(V[22], pal[2], ink, ink, pal[0], ink, ink, pal[0]);
  else if (id === V[23]) art = gdf(V[24], pal[0]) + gdf(V[25], ink, pal[0], ink) + gdf(V[26], ink, pal[1], ink) + gdf(V[27], ink, pal[2], ink, ink, pal[1]) + gdf(V[28], pal[2], ink, ink);
  return V[29] + art + V[30];
}
// mural_stories.gd svg(scenes, pal): the 600x300 scene paper under the mural.
export function muralScenesSVG(scenes, pal) {
  const S = A['mural_stories.gd'].svg;
  let out = gdf(S[0], pal[0]);
  for (let x = 16; x < 600; x += 23) out += gdf(S[1], x);
  for (const slot of SCENE_SLOTS) if (Object.hasOwn(scenes, slot)) out += gdf(S[2], slot === S[3] ? 14 : 314, vignette(scenes[slot], pal));
  return out + S[4];
}
export const sceneThumbnailSVG = (id, pal) => A['mural_stories.gd'].thumbnail[0] + vignette(id, pal) + A['mural_stories.gd'].thumbnail[1];

// mural_signature.gd svg(pal, stacked): Celeste's brass, drum, tea and heart border.
export function signatureSVG(pal, stacked = false) {
  const P = A['mural_signature.gd'].svg, w = stacked ? 72 : 288, h = stacked ? 128 : 32;
  let out = gdf(P[4], w, h, w, h);
  for (let i = 0; i < 4; i++) {
    const offset = stacked ? gdf(P[5], i * 32) : gdf(P[6], i * 72);
    out += gdf(P[7], offset, P[i]);
    out += gdf(P[8], offset, pal[i % 3], P[i]);
  }
  return out + P[9];
}

// The Gather again board: programme_gathering.gd _draw (card_rect, prop_rect) flattened to one 720x480 SVG.
// Stories and art are Godot's painted textures (the invitation and the tile panel); beats and pause are drawn.
const OWNER_BY_ID = Object.fromEntries(C['hosted_afternoon.gd'].IDS.map((id, i) => [id, C['hosted_afternoon.gd'].OWNERS[i]]));
export function gatherCardRect(index) {
  const cell = [(720 - 12) / 2, (480 - 12) / 2], p = [[0, 0], [1, 0], [1, 1], [0, 1]][index];
  return { x: p[0] * (cell[0] + 12), y: p[1] * (cell[1] + 12), w: cell[0], h: cell[1] };
}
function propRect(index) {
  const r = gatherCardRect(index), area = { x: r.x + 6, y: r.y + 23, w: r.w - 12, h: r.h - 43 }, scale = Math.max(0.01, Math.min(area.w / 360, area.h / 240));
  return { x: area.x + (area.w - 360 * scale) / 2, y: area.y + (area.h - 240 * scale) / 2, scale };
}
export function gatherBoardSVG(g, { title = '', desc = '', marks = {} } = {}) {
  if (!g.order.length) return '';
  let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480" role="img" aria-labelledby="gather-title gather-desc"><title id="gather-title">${escapeXML(title)}</title><desc id="gather-desc">${escapeXML(desc)}</desc><rect width="720" height="480" fill="#203c38"/>`;
  for (let i = 0; i < 4; i++) {
    const r = gatherCardRect(i), p = propRect(i), id = g.order[i];
    out += `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="#e7dcc0"/><rect x="${r.x + 2}" y="${r.y + 2}" width="${r.w - 4}" height="${r.h - 4}" fill="none" stroke="${i === g.step ? '#e2a04e' : '#526e65'}" stroke-width="3"/>`;
    out += `<text x="${r.x + 7}" y="${r.y + 17}" font-size="12" fill="#182c38" font-family="sans-serif">${i + 1}. ${OWNER_BY_ID[id]}</text>`;
    let prop;
    if (id === 'stories') prop = svgBody(beaInvitationSVG(g.copies.stories));
    else if (id === 'art') prop = svgBody(tilePanelSVG(g.copies.art));
    else {
      prop = '<rect width="360" height="240" fill="#f8f0d9"/>';
      if (id === 'beats') for (let s = 0; s < 8; s++) prop += `<circle cx="${32 + (s % 4) * 85}" cy="${70 + Math.floor(s / 4) * 100}" r="24" fill="${g.copies.beats & (1 << s) ? '#548b84' : '#d8cdb2'}" stroke="#29434a" stroke-width="3"/>`;
      else {
        const seats = g.copies.pause === 'arc' ? [[62, 140], [156, 60], [250, 140]] : [[62, 70], [62, 140], [250, 140]];
        for (let s = 0; s < 3; s++) prop += `<rect x="${seats[s][0]}" y="${seats[s][1]}" width="45" height="40" fill="${s === 2 ? '#e8b861' : '#548b84'}" stroke="#29434a" stroke-width="4"/>`;
      }
    }
    out += `<g transform="translate(${p.x} ${p.y}) scale(${p.scale})">${prop}</g>`;
    const mark = i === 0 ? marks.opening : i <= g.gestures.length && g.gestures[i - 1] === 0 ? marks.invite : i <= g.gestures.length ? marks.room : marks.notYet;
    out += `<text x="${r.x + 7}" y="${r.y + r.h - 6}" font-size="12" fill="#182c38" font-family="sans-serif">${escapeXML(mark ?? '')}</text>`;
    if (i > 0 && i <= g.gestures.length) {
      const a = gatherCardRect(i - 1), cx = (a.x + a.w / 2 + r.x + r.w / 2) / 2, cy = (a.y + a.h / 2 + r.y + r.h / 2) / 2;
      out += g.gestures[i - 1] === 0
        ? `<path d="M${cx - 6} ${cy}H${cx + 6}" stroke="#e8b861" stroke-width="4"/><circle cx="${cx}" cy="${cy}" r="3" fill="#f8f0d9"/>`
        : `<path d="M${(cx + 5 * Math.cos(0.3)).toFixed(2)} ${(cy + 5 * Math.sin(0.3)).toFixed(2)}A5 5 0 0 1 ${(cx + 5 * Math.cos(2.8)).toFixed(2)} ${(cy + 5 * Math.sin(2.8)).toFixed(2)}" fill="none" stroke="#e8b861" stroke-width="3"/>`;
    }
  }
  return out + '</svg>';
}
