// The five neighbors' conversations, ported from godot/main.gd: neighbor_lines,
// neighbor_greeting_line, mural_neighbor_reply, celeste_dialogue_text, rook_dialogue_text,
// layout_memory_line, neighbor_surprise_memory_line, neighbor_project_memory_line,
// neighbor_memory_tail, mural_composition_reply, mural_scene_reply, spark_count, active_stem_summary,
// conversation_actions, apply_block_panel_mode, update_block_ui, update_mural_ui, update_music_ui,
// end_conversation, talk_with_neighbor and finish_neighbor_arrival. Every Godot line is copied
// verbatim (tests/next-characters.test.mjs fails on drift); CHARACTER_WEB_OVERRIDES rewrites only
// the lines that name Godot's 3D-only keys and controls (Shift+D surprises, T, Shift Motif,
// Pack Borrowed Gear). The side stories' action labels (Spot Surprise, Visit the Museum, Visit
// Eateries) are visits/text.js's copies.
//
// Pure: no DOM, timers or storage. Inputs:
// - state: fork state (the state parseGodotSave returns), never the Godot envelope;
// - extras: godotExtras(envelope), the Godot-only fields read from the loaded save and cleaned
//   the way Godot cleans them (read-only; the fork never writes them from here);
// - talk: the session's talk counters, freshTalk() on load and on Start over. Godot saves only
//   Celeste's count, which is state.celesteTalks; the rest are session-only, as in Godot.
import { NEIGHBOR_IDS, NEIGHBOR_NAMES, LOAN_TITLES, MURAL_MOTIFS, GATHERING_LAYOUTS, PROGRAMME_SEGMENTS, isHostingDone, nextObjective, whatsNextLine, hintFor } from './story.js';
import { SURPRISE_IDS } from './godot-save.js';
import { musicLayers } from './core.js';
import { FILM_SHOTS } from './film.js';
import { loanMemory, conversationLoan } from './hosted-text.js';
import { spokenText } from './bubble.js';
import { GODOT_TEXT } from './visits/text.js';
import { format, L, narrow, isEnglish, list as joinList, FLAVORS, fillTranslated } from './i18n.js';

export { spokenText };
// godot/main.gd neighbors (positions are 2D's own, in world.js) and NEIGHBOR_STORY_BADGES.
export const CHARACTER_PEOPLE = [
  { id: 'bea', name: 'Bea', role: 'The one with the plan', coat: '#c5874f', skin: '#966345', hair: '#dad7c6' },
  { id: 'celeste', name: 'Celeste', role: 'Signs, paint & possibility', coat: '#c87d82', skin: '#8b5b3f', hair: '#383c32' },
  { id: 'rook', name: 'Rook', role: 'Good ears. Better stories.', coat: '#547a79', skin: '#a97650', hair: '#3f352c' },
  { id: 'dez', name: 'Dez', role: 'Always making a beat', coat: '#978aaf', skin: '#704b37', hair: '#292f2b' },
  { id: 'thanh', name: 'Thanh', role: 'Neighbor & supply lender', coat: '#b59b5d', skin: '#c38c65', hair: '#454236' },
];
export const NEIGHBOR_BADGES = {
  bea: 'Block Organizer · Warm & Steady',
  celeste: 'Sidewalk Muralist · Bright & Inviting',
  rook: 'Sound Keeper · Cool & Observant',
  dez: '80 BPM Beatmaker · Easygoing Groove',
  thanh: 'Tea & Stools Host · Generous & Calm',
};
export const NEIGHBOR_SURPRISE_PAIRS = {
  bea: ['mayor_pomp_event', 'good_donut_and_bagel'],
  celeste: ['hidden_mural_145', 'cutesy_dino'],
  rook: ['jeffrey_record', 'clown_horn_walker'],
  dez: ['viking_dirt_biker', 'magic_carpet_chef'],
  thanh: ['impromptu_drag_show', 'bite_size_nachos'],
};
export const STEM_ORDER = ['bass', 'brush', 'chords', 'lead'];
export const MURAL_SCENE_IDS = ['cooking', 'sharing', 'painting', 'music', 'garden'];
export const MURAL_SCENE_SLOTS = ['left', 'right'];
export const MURAL_SCENE_NAMES = { cooking: 'Cooking Together', sharing: 'Sharing a Bowl', painting: 'Making Street Art', music: 'Making Music', garden: 'Growing Together' };
// compass_phrase(neighbor_xz(0), BOEDDEKER_PARK_ENTRANCE) from Bea's fixed spot; the test recomputes it.
export const BOEDDEKER_FROM_BEA = 'about a block northwest';

// neighbor_lines: five lines per chapter for Bea, Dez and Thanh (Bea's before[3] keeps its %s).
export const NEIGHBOR_LINES = {
  bea: {
    open: [
      'Bea: "Look at Turk Street come alive! Let\'s take a group photo, plan our party schedule, or hold our tenant listening circle."',
      'Bea: "Tap \'Plan Party Schedule\' to line up stories, rhythm, shared art tiles, and a quiet pause for the block."',
      'Bea: "Every neighbor\'s voice belongs here at Turk & Taylor. Have you read the 1966 Compton\'s plaque on the corner?"',
      'Bea: "Thanks for showing up for the block. That\'s all a party really is: neighbors deciding to be here for each other."',
      'Bea: "If you lose track of the afternoon, tap What\'s Next?—or press Shift+D to spot the small cutesy dinosaur by Boeddeker Park and the wild woman chef on a magic carpet!"',
    ],
    before: [
      'Bea: "Welcome to Turk & Taylor! Greet all 5 neighbors, add 3 mural motifs, and run Rook\'s soundcheck to open our block."',
      'Bea: "I\'ve got the signboard ready by my rollator. Tap Go Meet below and I\'ll point you to the next neighbor."',
      'Bea: "Once all 5 of us have met, Celeste\'s easel is painted, and Rook\'s speaker is checked, tap \'Open Block Party!\' right below."',
      'Bea: "Boeddeker Park is %s, if you ever want a bench and some trees."',
      'Bea: "Lost? Tap What\'s Next? any time—or press Shift+D if you hear rumors of a small cutesy dinosaur or a wild woman chef on a magic carpet!"',
    ],
  },
  dez: {
    open: [
      'Dez: "The block party is jumping! Tap \'Plan Party Schedule\' or \'Shoot Short Film\' to work on our afternoon projects."',
      'Dez: "During the rhythm workshop we can toggle an 8-step beat pattern right from the sidewalk, and playing quiet always counts too."',
      'Dez: "If you stroll out west to Dodge Alley or Turk & Hyde, you can feel that classic Tenderloin jazz history in the air."',
      'Dez: "Celeste and I want to make a little three-shot film. Ask me when you\'re ready."',
      'Dez: "Thanks for keeping the tempo easy—and if you spot that random guy on a dirt bike in a Viking helmet or Jeffrey\'s lost 1961 record by 361 Turk, press Shift+D!"',
    ],
    before: [
      'Dez: "80 BPM pocket is locked in near Mason. Use the conversation actions below to meet anyone left or get our block party rolling!"',
      'Dez: "Have you chatted with Rook by the Turk Street speaker yet? Every neighbor you meet and motif you paint unlocks another layer of the groove."',
      'Dez: "Paint with Celeste, soundcheck with Rook, or take a walk west to the Black Hawk jazz site at Turk & Hyde!"',
      'Dez: "I keep the groove at 80 BPM so nobody has to shout over it."',
      'Dez: "The Black Hawk at Turk & Hyde had jazz from 1949 to 1963—and rumor has it Jeffrey\'s lost 1961 record and a guy on a dirt bike in a Viking helmet are out along Turk (Shift+D)!"',
    ],
  },
  thanh: {
    open: [
      'Thanh: "Pull up a stool and pour some hot jasmine tea! We can snap a group photo, host the party schedule, or hold our tenant circle."',
      'Thanh: "Whenever the afternoon winds down, tap \'Pack Borrowed Gear\' and we\'ll return the folding table, paint case, and speaker."',
      'Thanh: "I love seeing the sidewalk stay clear for neighbors passing through while we share stories around the long table."',
      'Thanh: "More jasmine tea? There\'s plenty."',
      'Thanh: "When everyone\'s ready, we pack up together—and don\'t miss the surprise drag show, bite-sized bags of nachos, fresh donut & bagel, clown horn walker, or the impromptu Mayor Public Event (Shift+D)!"',
    ],
    before: [
      'Thanh: "Hot tea and folding stools are stacked on Taylor Street. Once all 5 neighbors, the mural, and the soundcheck are ready, we open the block party!"',
      'Thanh: "Celeste has her portable mural easel set up on Turk Street, and Rook is testing the sidewalk speaker just down the block."',
      'Thanh: "Tap any action below to meet the rest of the block. We\'re keeping the through-route clear for everyone on Taylor and Turk."',
      'Thanh: "The folding table is mine. Borrow it for the party, and we\'ll carry it back together when we pack up."',
      'Thanh: "Bea taught me to keep the sidewalk wide enough for walkers, strollers, bite-sized nachos, a good donut or bagel, a guy with a clown horn, and even an impromptu Mayor Public Event (Shift+D)!"',
    ],
  },
};
// celeste_dialogue_text: completed[0] wraps mural_composition_reply().
export const CELESTE_LINES = {
  completed: [
    'Celeste: "%s"',
    'Celeste: "Try cycling Garden, Sunset, or Ocean palettes anytime—even after the board is complete, the colors shift on the easel and in our keepsake."',
    'Celeste: "Once the block gathering opens, we can host the shared six-tile art panel and help Dez frame our three-shot short film, The Open Seat."',
    'Celeste: "I love how our freestanding board keeps the Turk Street sidewalk wide open while giving the block a shared canvas."',
    'Celeste: "Have you walked over to 145 Leavenworth or Boeddeker Park yet? Press Shift+D to spot the hidden mural alcove and Pip the Tiny Dino!"',
  ],
  before: [
    'Celeste: "Welcome to my easel! Add Sun, Wave, and Rise with the buttons below."',
    'Celeste: "Try Garden, Sunset, or Ocean, or tap Shift Motif to slide your shape around the 6×3 board."',
    'Celeste: "It\'s a freestanding sidewalk board, so no wall gets painted and nobody\'s facade changes."',
    'Celeste: "There\'s no wrong spot for a shape. Put it where it feels right to you."',
    'Celeste: "When the board is finished, Rook\'s groove gets another layer—and if you walk over to 145 Leavenworth, look for the hidden mural alcove below the 8th floor (Shift+D)!"',
  ],
};
// rook_dialogue_text: local plays a loaded track; before[0] takes active_stem_summary().
export const ROOK_LINES = {
  local: 'Rook: "Spinning your local cut (%s) on the Turk Street speaker. It stays in this tab and is never uploaded."',
  completed: [
    'Rook: "Celeste\'s finished mural unlocked the last layer. The full 4-part 80 BPM sketch is ready: hit Play Groove or load your own track."',
    'Rook: "Hear how bass, brush, chords, and lead lock together at 80 BPM? You can cycle volume or pause anytime—the block party stays sound-independent."',
    'Rook: "During the afternoon schedule and the tenant listening circle, I keep the speaker gentle so every neighbor on Turk Street is heard."',
    'Rook: "I\'ll stay off camera when you snap the keepsake photo and shoot The Open Seat, but I\'m right here on the sound cue."',
    'Rook: "If you walk out toward 361 Turk or Jones & Turk, press Shift+D—Jeffrey\'s lost 1961 LP and Honker Barnaby are right in pocket with our groove!"',
  ],
  before: [
    'Rook: "Speaker\'s set up on the sidewalk and the soundcheck is done (%s)."',
    'Rook: "Every neighbor you meet and motif you paint unlocks another layer: bass, brushes, chords, then lead."',
    'Rook: "We can keep the street quiet or play the groove. The party works either way."',
    'Rook: "I\'d rather stay off camera, but I\'ll always run the sound."',
    'Rook: "If you load your own track, it stays in this browser tab. Nothing gets uploaded."',
  ],
};
export const LAYOUT_MEMORY = {
  bea: { table: 'Bea: "The Long Table worked: everyone had a seat and a story. I promised Dez and Celeste the Open Floor next time."', floor: 'Bea: "The Open Floor was the right call today. Next time we try my Long Table, I\'m holding you to it."' },
  celeste: { table: 'Celeste: "The Long Table framed our 3/3 easel like a warm neighborhood gallery—and Bea promised us the Open Floor next time."', floor: 'Celeste: "Seeing our Open Floor painted tiles beside the 3/3 sidewalk easel made the whole block feel like an art studio."' },
  rook: { table: 'Rook: "The 80 BPM pocket carried right down the Long Table without anyone having to raise their voice."', floor: 'Rook: "The Open Floor gave Dez\'s beat and the 4-part groove plenty of room to breathe across the curb lane."' },
  dez: { table: 'Dez: "The Long Table was cozy. Next time, Open Floor. Bea promised."', floor: 'Dez: "Look at that Open Floor! Celeste\'s lettering and my beat, side by side."' },
  thanh: { table: 'Thanh: "My folding table made a fine Long Table. Plenty of tea to go around."', floor: 'Thanh: "The Open Floor gave everyone room to move. I kept the tea by the curb."' },
};
// neighbor_surprise_memory_line: both paired surprises, the first only, the second only.
export const SURPRISE_MEMORY = {
  bea: {
    both: '“The Block Mayor cut a giant ribbon on Eddy & Leavenworth with pomp and circumstance, and Baker Mae shared warm donuts and everything bagels on Eddy & Taylor!”',
    first: '“Did you see the Block Mayor\'s impromptu ribbon cutting on Eddy & Leavenworth? All that pomp and circumstance for Neighbor Appreciation Hour!”',
    second: '“Baker Mae\'s pink-frosted glazed donut and toasted everything bagel on Eddy & Taylor are the warmest treat on the block!”',
  },
  celeste: {
    both: '“You found my hidden mural below the 8th floor at 145 Leavenworth and met Pip the Tiny Dino by Boeddeker Park—I pinned the sketch to my easel!”',
    first: '“You found my hidden mural alcove at 145 Leavenworth below the 8th-floor bay window! I pinned the golden hound and sax sketch right onto my easel.”',
    second: '“Pip the Tiny Dino by Boeddeker Park wagged that pastel tail while I sketched those mint-and-coral back plates!”',
  },
  rook: {
    both: '“Jeffrey\'s 1961 LP from 361 Turk is spinning on top of my speaker, and Honker Barnaby honked right on the downbeat!”',
    first: '“You brought Jeffrey\'s lost 1961 record from the 361 Turk \'So What\' awning! Look on top of my speaker—that 33 RPM vinyl is spinning for the whole block.”',
    second: '“Honker Barnaby strolled past Jones & Turk and gave two gentle squeezes on that red-bulb clown horn right in pocket with our groove!”',
  },
  dez: {
    both: '“A Viking-helmet dirt biker on the 200 block of Turk and Chef Zafira flying on a magic carpet over Eddy—this neighborhood has the best rhythm in the city!”',
    first: '“That guy idling on a dirt bike in a horned Viking helmet on the 200 block of Turk nodded right in time with our 80 BPM pocket!”',
    second: '“Chef Zafira floated above Eddy & Leavenworth on her crimson-and-gold magic carpet tossing star-anise noodles in a flaming copper wok!”',
  },
  thanh: {
    both: '“Starlight Vee\'s surprise drag runway at Taylor & Turk and Nacho Captain Rico\'s bite-sized nacho bags made the whole sidewalk glow!”',
    first: '“Starlight Vee rolled out a magenta runway near Taylor & Turk for an impromptu drag show right in the Transgender Cultural District!”',
    second: '“Nacho Captain Rico shared warm bite-sized bags of tortilla chips and roasted salsa verde right down the sidewalk from my tea table!”',
  },
};
// neighbor_project_memory_line, in Godot's precedence: film, civic, Bea's stories, Thanh's pause,
// then the loan homecoming reply (hosted-text.js loanMemory).
export const PROJECT_MEMORY = {
  film: {
    rook: '“I helped with the cue and stayed out of the picture. A no can belong in a good film too.”',
    celesteWide: '“Dez and I offered our hands, not everyone else’s faces. We made the picture together.”',
    celesteClose: '“Our props told the story without putting anyone on camera. I like that small frame.”',
    thanh: '“The crew held the take while I used the route. A production should fit around the people who live here.”',
    beaLater: '“They waited until the conversation finished. Being heard mattered more than rushing a take.”',
    beaQuiet: '“We could keep talking while they worked quietly. The film made room for our afternoon.”',
    dez: '“We ended on %s. A different order would tell a different little story.”',
  },
  civic: {
    beaRepairs: '“We put repairs and staying put into the conversation. One listening hour is a beginning, not a promise that housing problems are solved.”',
    beaAccess: '“I still want us to talk about repairs. Making room to come and go gave us a useful place to begin.”',
    thanhDropin: '“I could join for a few minutes and leave when I needed to. Keeping the table off the route mattered.”',
    thanhCircle: '“I liked hearing everyone together. Next time, could we leave a drop-in moment for people who cannot stay?”',
    celesteThemes: '“The shared request has no names or personal stories attached. Nobody owes us their story.”',
    celesteNone: '“We agreed to keep no meeting notes. Listening can matter without making a record of someone.”',
    rook: '“No microphone needed. A listening hour can have room for a disagreement and a quiet voice.”',
    dez: '“I helped welcome people who just wanted to listen. Nobody had to sign anything or agree to belong.”',
  },
  stories: { memory: '“That little folded note reminded me how a small welcome can stay with someone. Listening was enough too.”', future: '“Different paper flags, and a few left blank for whoever arrives later. I am keeping that invitation open.”' },
  pause: { arc: '“That open arc left room for someone to join without moving everyone.”', pairs: '“A pair for a quiet conversation, and an open seat someone could join.”' },
};
export const MURAL_REPLY = {
  dez: { scene: 'music', text: ' That painted guitar leaves room for a quiet song, too.' },
  thanh: { scene: 'garden', text: ' Two pairs of hands tending that painted planter. Growing something takes neighbors, too.' },
};
// mural_composition_reply and mural_scene_reply.
export const COMPOSITION = {
  incomplete: 'Lulu brought Sun, Dez brought Wave, and I brought Rise. Choose a contribution, then an empty space. There is no wrong arrangement.',
  horizon: "Lulu's Sun and Dez's Wave share a horizon.",
  sunAbove: "Lulu's Sun shines above Dez's Wave.",
  waveAbove: "Dez's Wave floats above Lulu's Sun.",
  riseLeft: ' My Rise opens the scene on the left.',
  riseRight: ' My Rise carries it to the right.',
  riseLinks: ' My Rise links the shapes together.',
  close: " Three neighbors' ideas, arranged your way. Choose Compose Mural, then Paint Scenes for food, music, art or gardening.",
  noScenes: 'A meal, a painter, a guitarist or neighbors growing plants can tell another story here.',
  scene: '%s on the %s',
  scenesClose: '. You made room for everyday creativity.',
};
// Panel headers, details, the three fixed buttons and the spoken captions.
export const PANEL_TEXT = {
  header: 'Talking with %s (%s · %s · Turn %d/5)  ·  %s  ·  %d/%d Met  ·  Mural %s  ·  Sparks: %d',
  headerNarrow: '%s · Turn %d/5 · Sparks: %d',
  openTag: 'Block Party Open!', readyTag: 'Ready to Open!', prepareTag: 'Meet Neighbors & Prepare',
  muralReady: '3/3 Ready', muralCount: '%d/3',
  detail: '%s  (Click %s or press T to keep chatting)',
  spokenJoin: '%s · %s',
  fallback: 'Choose a conversation topic or neighborhood action below',
  celesteHeader: 'Talking with Celeste (Mural Artist · %s · Turn %d/5)  ·  Easel: %s (%s Palette)  ·  Sparks: %d',
  celesteNarrow: 'Celeste · Turn %d/5 · Sparks: %d',
  easelComplete: '3/3 Complete', easelCount: '%d/3 Motifs Painted',
  celesteNarrowSpoken: 'Celeste: %s · %s',
  rookHeader: 'Talking with Rook (Sound & Stories · %s · Turn %d/5)  ·  %s  ·  %s  ·  Soundcheck: %s  ·  Sparks: %d',
  rookNarrow: 'Rook · Turn %d/5 · Sparks: %d',
  playing: 'Playing', paused: 'Paused', sketch: '80 BPM Sketch', local: 'Local: %s', scReady: 'Ready', scPending: 'Pending',
  rookNarrowSpoken: 'Rook: %s · %s',
  rookLocalDetail: 'Local full track: %s (procedural stems hidden) — %s Use Sketch returns to the original 80 BPM music.',
  rookSketchDetail: 'Original 80 BPM sketch · Soundcheck: %s · Groove Stems: %s — %s',
  stems: '%s (%d/%d stems)',
  // neighbor_greeting_line's surprise slot; celeste_ and rook_dialogue_text write it with the name in place.
  quoted: '%s: "%s"',
};
export const BUTTON_TEXT = {
  chat: 'Keep Chatting (T)', chatNarrow: 'Chat More',
  next: "What's Next?", nextNarrow: 'Next Step',
  bye: 'Goodbye (Esc)', byeNarrow: 'Goodbye',
  play: 'Play Groove', pause: 'Pause Groove', volume: 'Volume: %d%%',
  rookDone: 'Chat & Soundcheck (Done)', rookCheck: 'Soundcheck w/ Rook', rookDoneNarrow: 'Chat w/ Rook', rookCheckNarrow: 'Check Sound',
  sketchActive: '80 BPM Sketch (Active)', sketchUse: 'Use 80 BPM Sketch', sketchActiveNarrow: 'Sketch On', sketchUseNarrow: 'Use Sketch',
  hint: 'Hint', close: 'Close',
  // make_ui: Rook's Load Local Track, and the mural's Compose Mural, which 2D offers in Celeste's conversation.
  load: 'Load Local Track', compose: 'Compose\nMural',
};
export const CAPTION_TEXT = {
  arrived: 'Arrived at %s (%s). Visited %d/5 neighbors.%s',
  arrivedCeleste: 'Arrived at %s (%s). Portable Mural Board %d/3 motifs.%s',
  arrivedRook: 'Arrived at %s (%s). %s.%s',
  soundReady: 'Soundcheck ready', soundTap: 'Tap Soundcheck below',
  talking: 'Talking with %s (%s) · Click %s again or choose an action below',
  goodbye: 'You said goodbye to %s.',
  goodbyeA11y: 'Said goodbye to %s. Next: %s',
  goodbyeNobody: 'the block',
  whatsNextA11y: 'Next: %s. %s',
  spokenWithTail: '%s %s',
};
// conversation_actions labels and the hub button labels it borrows. Spot Surprise, Visit the Museum and Visit Eateries are
// visits/text.js's copies (the side stories' one table); the landmark tour's label is the explore goal's tourAction.
const VISIT_ACTIONS = GODOT_TEXT['main.gd'].conversation_actions;
export const ACTION_LABELS = {
  layoutTable: 'Long Table (Bea)', layoutFloor: 'Open Floor (Dez & Celeste)', hub: 'All Block Actions',
  returned: 'Returned ', return: 'Return ',
  meet: 'Go Meet %s', mural: 'Paint with Celeste', soundcheck: 'Soundcheck with Rook', open: 'Open Block Party!', photo: 'Take Group Photo',
  pack: 'Pack Gear', returnGear: 'Return Gear (%d/3)',
  comptons: "Walk to Compton's", blackhawk: 'Walk to Black Hawk',
  surprise: VISIT_ACTIONS.spot, museum: VISIT_ACTIONS.museum,
  sharedPanel: "Celeste's Shared Panel", talkTo: 'Talk to %s', plaque: "See Compton's Plaque", eateries: VISIT_ACTIONS.eateries,
};
export const HUB_LABELS = {
  programmeDone: 'Hosted All 4 Events', programmeHost: 'Host Activity (%d/4)', programmeStart: 'Start Hosting Party', programmeDraft: 'Plan Schedule (%d/4)', programme: 'Plan Party Schedule',
  civicDone: 'Tenant Circle (Done)', civicMeeting: 'Share Circle Notes', civicPlanning: 'Convene Circle', civic: 'Hold Tenant Circle',
  filmDone: 'Watch Film (%d/3)', filmShooting: 'Shoot Frame (%d/3)', filmHold: 'Roll Camera (Clear)', filmPlanning: 'Set Up Film Shot', film: 'Shoot Short Film',
};
// apply_block_panel_mode's narrow .replace chain, in order.
export const NARROW_LABEL_REWRITES = [
  ['Go Meet ', 'Meet '], ['All Block Actions', 'All Actions'], ['Spot Surprise (', 'Find '], ['/10)', '/10'], ['Visit the Museum', 'Museum'], ['Visit the Park', 'Park'],
  ['Order at Next Stop', 'Order Next'], ['Visit Eateries', 'Eateries'], [' with Celeste', ''], [' with Rook', ''], [' (Bea)', ''], [' (Dez & Celeste)', ''],
];
// Conversation steps that reopen the conversation after they run (run_conversation_action).
export const REOPEN_ACTIONS = ['epilogue', 'programme', 'civic', 'film', 'open', 'layout_table', 'layout_floor'];
// The conversation buttons Godot marks rapid: Keep Chatting (conv_chat_btn) and Rook's Volume (music_vol_btn). The
// Mural Stories Palette is rapid too (ending/mural.js); tests/next-press-settle.test.mjs pins every rapid mark on both sides.
export const RAPID_BUTTONS = ['chat', 'volume'];

// Godot text -> 2D text, keyed by the exact copied line. Only lines naming Godot's 3D-only keys or
// controls are here, and each keeps every other Godot word: the surprise lines drop their (Shift+D)
// hint, or say "choose Spot Surprise" (the 2D button for the hunt) where Godot says "press Shift+D";
// the T key's hints are dropped; the Shift Motif button and the hub's Pack Borrowed Gear button
// become 2D's "choose a new space" and the conversation's Pack Gear.
export const CHARACTER_WEB_OVERRIDES = {
  [NEIGHBOR_LINES.bea.open[4]]: 'Bea: "If you lose track of the afternoon, tap What\'s Next?—or choose Spot Surprise to spot the small cutesy dinosaur by Boeddeker Park and the wild woman chef on a magic carpet!"',
  [NEIGHBOR_LINES.bea.before[4]]: 'Bea: "Lost? Tap What\'s Next? any time—or choose Spot Surprise if you hear rumors of a small cutesy dinosaur or a wild woman chef on a magic carpet!"',
  [NEIGHBOR_LINES.dez.open[4]]: 'Dez: "Thanks for keeping the tempo easy—and if you spot that random guy on a dirt bike in a Viking helmet or Jeffrey\'s lost 1961 record by 361 Turk, choose Spot Surprise!"',
  [NEIGHBOR_LINES.dez.before[4]]: 'Dez: "The Black Hawk at Turk & Hyde had jazz from 1949 to 1963—and rumor has it Jeffrey\'s lost 1961 record and a guy on a dirt bike in a Viking helmet are out along Turk!"',
  [NEIGHBOR_LINES.thanh.open[1]]: 'Thanh: "Whenever the afternoon winds down, tap \'Pack Gear\' and we\'ll return the folding table, paint case, and speaker."',
  [NEIGHBOR_LINES.thanh.open[4]]: 'Thanh: "When everyone\'s ready, we pack up together—and don\'t miss the surprise drag show, bite-sized bags of nachos, fresh donut & bagel, clown horn walker, or the impromptu Mayor Public Event!"',
  [NEIGHBOR_LINES.thanh.before[4]]: 'Thanh: "Bea taught me to keep the sidewalk wide enough for walkers, strollers, bite-sized nachos, a good donut or bagel, a guy with a clown horn, and even an impromptu Mayor Public Event!"',
  [CELESTE_LINES.completed[4]]: 'Celeste: "Have you walked over to 145 Leavenworth or Boeddeker Park yet? Choose Spot Surprise to spot the hidden mural alcove and Pip the Tiny Dino!"',
  [CELESTE_LINES.before[1]]: 'Celeste: "Try Garden, Sunset, or Ocean, or choose a new space to slide your shape around the 6×3 board."',
  [CELESTE_LINES.before[4]]: 'Celeste: "When the board is finished, Rook\'s groove gets another layer—and if you walk over to 145 Leavenworth, look for the hidden mural alcove below the 8th floor!"',
  [ROOK_LINES.completed[4]]: 'Rook: "If you walk out toward 361 Turk or Jones & Turk, choose Spot Surprise—Jeffrey\'s lost 1961 LP and Honker Barnaby are right in pocket with our groove!"',
  [PANEL_TEXT.detail]: '%s',
  [BUTTON_TEXT.chat]: 'Keep Chatting',
};
export const webLine = text => Object.hasOwn(CHARACTER_WEB_OVERRIDES, text) ? CHARACTER_WEB_OVERRIDES[text] : text;
// Fork composites and display names (docs/I18N_PLAN.md 2.7 and 1.3.12 #11): whole templates for the labels and lines Godot builds
// from a fragment and a value, or from an id, so a translator sees one phrase and a locale never title-cases or lowercases
// text. Each equals Godot's English for every input (tests/next-i18n-dialogue.test.mjs): returned and return are
// ACTION_LABELS.returned / .return + the loan's title; sceneAt is COMPOSITION.scene with the slot id; filmEnded is
// PROJECT_MEMORY.film.dez with the last shot's label lowercased; palettes is capitalize(palette id) in panelHeader.
export const CHARACTER_COMPOSE = {
  returned: 'Returned %s', return: 'Return %s',
  sceneAt: { left: '%s on the left', right: '%s on the right' },
  filmEnded: {
    seat: '“We ended on an empty seat. A different order would tell a different little story.”',
    paint: '“We ended on a shared motif. A different order would tell a different little story.”',
    welcome: '“We ended on room for one more. A different order would tell a different little story.”',
  },
  palettes: { garden: 'Garden', sunset: 'Sunset', ocean: 'Ocean' },
};

// GDScript % formatting for %s, %d and %%. In a locale the template is looked up first (i18n.js format, the characters
// flavor); English is this function's own result. Table values passed as arguments are localized by the caller (L).
function legacyFormat(template, args) {
  let i = 0;
  return String(template).replace(/%%|%[sd]/g, spec => {
    if (spec === '%%') return '%';
    const v = args[i++];
    return spec === '%d' ? String(Math.trunc(Number(v))) : String(v);
  });
}
const FORMAT = { ...FLAVORS.characters, legacy: legacyFormat };
export function gdFormat(template, ...args) {
  return format(template, args, FORMAT);
}
const say = (template, ...args) => gdFormat(webLine(template), ...args);
// A table line as the 2D edition shows it, in the active language: its 2D override, then the catalog.
const shown = line => L(webLine(line));
const list = value => Array.isArray(value) ? value : [];
const posmod = (a, n) => ((a % n) + n) % n;
const trimPrefix = (s, p) => s.startsWith(p) ? s.slice(p.length) : s;
const trimSuffix = (s, p) => p && s.endsWith(p) ? s.slice(0, -p.length) : s;
const unquote = memory => trimSuffix(trimPrefix(memory, '“'), '”');
// A memory's quotes off, in the active language. A translation keeps one pair of quotes (the validator's quote parity), in
// whichever marks its language uses: “…”, «…» or „…“.
const unquoteShown = memory => isEnglish() ? unquote(memory) : String(memory).replace(/^[“«„]/, '').replace(/[”»“]$/, '');
const capitalize = word => String(word).split(/[_\s]+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ');
const person = id => CHARACTER_PEOPLE.find(p => p.id === id) ?? null;
// A neighbor's surprise memory (the English table value) as their line, Name: "memory", in the active language.
const quoted = (id, memory) => gdFormat(PANEL_TEXT.quoted, L(person(id)?.name ?? capitalize(id)), unquoteShown(L(memory)));
// panelHeader's palette name: Godot capitalizes the id, which CHARACTER_COMPOSE.palettes spells out.
const paletteName = id => Object.hasOwn(CHARACTER_COMPOSE.palettes, id) ? L(CHARACTER_COMPOSE.palettes[id]) : capitalize(id);
const placedMotifs = state => MURAL_MOTIFS.filter(id => state?.mural?.[id]).length;
const muralCompleted = state => placedMotifs(state) === MURAL_MOTIFS.length;
const hostedValue = (state, id) => list(state?.hosting?.results).find(entry => entry?.id === id)?.value ?? null;
const hasHosted = (state, id) => list(state?.hosting?.results).some(entry => entry?.id === id);
function forkState(state) {
  if (state && typeof state === 'object' && (Object.hasOwn(state, 'block_opened') || Object.hasOwn(state, 'visited_neighbors'))) {
    throw new TypeError('characters.js reads fork state, not a Godot save envelope: pass godotExtras(envelope) for the Godot-only fields');
  }
  return state ?? {};
}

// mural_stories.gd clean(): slots left and right, known ids, no id twice.
export function cleanMuralScenes(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const slot of MURAL_SCENE_SLOTS) {
    const id = Object.hasOwn(raw, slot) ? raw[slot] : '';
    if (typeof id === 'string' && MURAL_SCENE_IDS.includes(id) && !Object.values(out).includes(id)) out[slot] = id;
  }
  return out;
}
// The Godot-only fields a loaded envelope carries, cleaned as Godot cleans them on load
// (discovered_surprises: known ids only; mural_scenes: clean()). Read-only.
export function godotExtras(envelope) {
  const env = envelope && typeof envelope === 'object' ? envelope : {};
  const surprises = new Set(list(env.discovered_surprises).filter(id => typeof id === 'string' && SURPRISE_IDS.includes(id)));
  return { surprises, muralScenes: cleanMuralScenes(env.mural_scenes) };
}
const extrasOf = extras => ({ surprises: extras?.surprises instanceof Set ? extras.surprises : new Set(list(extras?.surprises)), muralScenes: cleanMuralScenes(extras?.muralScenes) });

// Session-only talk counters (Godot neighbor_talk_counts and rook_talk_count), plus the loan the
// player last returned in this visit (loan_homecoming.gd confirmed_owner). Celeste's count is saved:
// it is state.celesteTalks, which the 'meet' reducer action raises.
export const freshTalk = () => ({ bea: 0, dez: 0, thanh: 0, rook: 0, confirmedLoan: '' });
// finish_neighbor_arrival: a first arrival counts as turn 1. Rook's count is untouched (Godot keeps
// it in rook_talk_count), Celeste's lives in the save.
export function arriveTalk(talk, id) {
  const next = { ...freshTalk(), ...talk };
  if (['bea', 'dez', 'thanh'].includes(id) && !(next[id] > 0)) next[id] = 1;
  return next;
}
// talk_with_neighbor / check_sound_with_rook: one more turn. Celeste's turn is the reducer's.
export function chatTalk(talk, id) {
  const next = { ...freshTalk(), ...talk };
  if (['bea', 'dez', 'thanh', 'rook'].includes(id)) next[id] = Math.max(0, Math.trunc(Number(next[id]) || 0)) + 1;
  return next;
}
export const confirmLoan = (talk, loanId) => ({ ...freshTalk(), ...talk, confirmedLoan: String(loanId ?? '') });
export function talkCount(state, talk, id) {
  if (id === 'celeste') return Math.max(0, Math.trunc(Number(forkState(state).celesteTalks) || 0));
  return Math.max(0, Math.trunc(Number(talk?.[id]) || 0));
}
export const lineIndex = (count, size = 5) => posmod(Math.max(1, Math.trunc(Number(count) || 0)) - 1, size);
export const turnNumber = count => lineIndex(count, 5) + 1;

// The English table line (or ''): callers show it in the active language.
export function layoutMemory(state, id) {
  const s = forkState(state);
  if (!GATHERING_LAYOUTS.includes(s.layout)) return '';
  return LAYOUT_MEMORY[id]?.[s.layout] ?? '';
}
export function surpriseMemory(extras, id) {
  const found = extrasOf(extras).surprises, pair = NEIGHBOR_SURPRISE_PAIRS[id], lines = SURPRISE_MEMORY[id];
  if (!pair || !lines) return '';
  if (found.has(pair[0]) && found.has(pair[1])) return lines.both;
  if (found.has(pair[0])) return lines.first;
  if (found.has(pair[1])) return lines.second;
  return '';
}
const validFilm = film => film?.phase === 'done' && film.result && ['close', 'wide'].includes(film.result.framing) && ['quiet', 'later'].includes(film.result.plan) && Array.isArray(film.result.order);
const validCivic = civic => civic?.phase === 'done' && civic.result && typeof civic.result === 'object';
// neighbor_project_memory_line's two parts, each in the active language: base (the project or loan memory) and surp (the
// surprise memory). Kept apart so the tail never has to find one inside the joined text.
function memoryParts(state, extras, id) {
  const s = forkState(state), surp = surpriseMemory(extras, id), F = PROJECT_MEMORY.film, C = PROJECT_MEMORY.civic;
  let base = '';
  if (validFilm(s.film)) {
    const order = s.film.result.order, lastId = order.length >= 3 ? String(order[2]) : 'welcome';
    // The last shot's label, lowercased into Dez's line: CHARACTER_COMPOSE.filmEnded writes it out for each shot.
    const dez = () => Object.hasOwn(CHARACTER_COMPOSE.filmEnded, lastId) && FILM_SHOTS[lastId] ? CHARACTER_COMPOSE.filmEnded[lastId] : gdFormat(F.dez, (FILM_SHOTS[lastId]?.label ?? String(order[2])).toLowerCase());
    base = ({ rook: F.rook, celeste: s.film.result.framing === 'wide' ? F.celesteWide : F.celesteClose, thanh: F.thanh, bea: s.film.result.plan === 'later' ? F.beaLater : F.beaQuiet, dez: id === 'dez' ? dez() : '' })[id] ?? '';
  } else if (validCivic(s.civic)) {
    const topic = String(s.civic.result.topic ?? 'repairs'), format = String(s.civic.result.format ?? 'circle'), notes = String(s.civic.result.notes ?? 'themes');
    base = ({ bea: topic === 'repairs' ? C.beaRepairs : C.beaAccess, thanh: format === 'dropin' ? C.thanhDropin : C.thanhCircle, celeste: notes === 'themes' ? C.celesteThemes : C.celesteNone, rook: C.rook, dez: C.dez })[id] ?? '';
  }
  if (!base && id === 'bea' && hasHosted(s, 'stories')) base = hostedValue(s, 'stories') === 'memory' ? PROJECT_MEMORY.stories.memory : PROJECT_MEMORY.stories.future;
  if (!base && id === 'thanh' && hasHosted(s, 'pause')) base = hostedValue(s, 'pause') === 'arc' ? PROJECT_MEMORY.pause.arc : PROJECT_MEMORY.pause.pairs;
  // loanMemory is already in the active language; every other base is a table line.
  base = base ? L(base) : loanMemory(s, id);
  return { base, surp: surp ? L(surp) : '' };
}
export function projectMemory(state, extras, id) {
  const { base, surp } = memoryParts(state, extras, id);
  if (base && surp) return gdFormat(PANEL_TEXT.spokenJoin, base, surp);
  return base || surp;
}
// neighbor_memory_tail: what follows the spoken line. A surprise memory already spoken is not
// repeated; with both a project memory and a surprise memory, even turns show the surprise.
export function memoryTail(state, extras, id, spoken, turnCount = 1) {
  const { base, surp } = memoryParts(state, extras, id);
  if (!base && !surp) return '';
  const clean = surp ? unquoteShown(surp) : '';
  if (clean && String(spoken ?? '').includes(clean)) return base;
  if (surp && base) return Math.max(1, Math.trunc(Number(turnCount) || 0)) % 2 === 0 ? surp : base;
  return base || surp;
}
// The art tail in the active language, or ''.
export function muralNeighborReply(extras, id) {
  const scenes = Object.values(extrasOf(extras).muralScenes), reply = MURAL_REPLY[id];
  return reply && scenes.includes(reply.scene) ? L(reply.text) : '';
}
export function muralSceneReply(extras) {
  const scenes = extrasOf(extras).muralScenes;
  if (!Object.keys(scenes).length) return L(COMPOSITION.noScenes);
  const names = MURAL_SCENE_SLOTS.filter(slot => Object.hasOwn(scenes, slot)).map(slot => gdFormat(CHARACTER_COMPOSE.sceneAt[slot], L(MURAL_SCENE_NAMES[scenes[slot]])));
  return joinList(names, items => items.join(', ')) + L(COMPOSITION.scenesClose);
}
export function muralCompositionReply(state, extras) {
  const s = forkState(state);
  if (placedMotifs(s) < 3) return L(COMPOSITION.incomplete);
  const { sun, wave, rise } = s.mural, row = p => Math.trunc(Number(p.row)), col = p => Math.trunc(Number(p.col));
  let line = COMPOSITION.horizon;
  if (row(sun) < row(wave)) line = COMPOSITION.sunAbove;
  else if (row(sun) > row(wave)) line = COMPOSITION.waveAbove;
  // Whole sentences joined: where the shapes are, where Rise sits, then the close.
  line = L(line);
  if (col(rise) < Math.min(col(sun), col(wave))) line += L(COMPOSITION.riseLeft);
  else if (col(rise) > Math.max(col(sun), col(wave))) line += L(COMPOSITION.riseRight);
  else line += L(COMPOSITION.riseLinks);
  return line + L(COMPOSITION.close) + (Object.keys(extrasOf(extras).muralScenes).length ? ' ' + muralSceneReply(extras) : '');
}
// active_stem_summary over core.js musicLayers (Godot recompute_music_stems).
export function activeStemSummary(state) {
  const layers = musicLayers(forkState(state)), on = [layers.layout, layers.tidy, layers.mural, layers.opened];
  const stems = STEM_ORDER.filter((_, i) => on[i]);
  return gdFormat(PANEL_TEXT.stems, stems.join('+'), stems.length, STEM_ORDER.length);
}
// spark_count: every earned step on the block, surprises from the save included.
export function sparkCount(state, extras) {
  const s = forkState(state), e = extrasOf(extras);
  let count = list(s.visited).filter(id => NEIGHBOR_IDS.includes(id)).length + placedMotifs(s) + e.surprises.size;
  if (s.soundcheck === true) count += 1;
  if (GATHERING_LAYOUTS.includes(s.layout)) count += 1;
  if (s.opened === true) count += 2;
  if ((s.epilogue?.photo?.status ?? 'unasked') === 'taken') count += 1;
  count += list(s.epilogue?.returned).length;
  count += list(s.hosting?.results).length;
  if (s.civic?.phase === 'done') count += 1;
  if (s.film?.phase === 'done') count += 1;
  if (s.history === true) count += 1;
  if (s.blackhawk === true) count += 1;
  return count;
}

export function neighborLines(state, id) {
  const lines = NEIGHBOR_LINES[id];
  if (!lines) return [];
  if (forkState(state).opened === true) return [...lines.open];
  return lines.before.map(line => line.includes('%s') ? gdFormat(line, BOEDDEKER_FROM_BEA) : line);
}
// The lines below are built in the active language: each table line through shown() (its 2D override, then the catalog), and
// each line Godot fills (Bea's Boeddeker line, Celeste's composition, Rook's stems, a quoted memory) through gdFormat.
// neighbor_greeting_line for Bea, Dez and Thanh.
export function greetingLine(state, extras, talk, id) {
  const s = forkState(state), lines = NEIGHBOR_LINES[id];
  if (!lines) return L(PANEL_TEXT.fallback);
  const options = s.opened === true ? lines.open.map(shown) : lines.before.map(line => line.includes('%s') ? say(line, L(BOEDDEKER_FROM_BEA)) : shown(line));
  const memory = s.opened === true ? layoutMemory(s, id) : '';
  if (memory && options.length >= 4) options[3] = shown(memory);
  const surp = surpriseMemory(extras, id);
  if (surp && options.length >= 5) options[4] = quoted(id, surp);
  const line = options[lineIndex(talkCount(s, talk, id), options.length)], art = muralNeighborReply(extras, id);
  // The art tail is a sentence of its own, said inside the speaker's quotes: every speech line ends with its closing quote, in
  // every language (the speech envelope rule).
  return art && line.endsWith('"') ? line.slice(0, -1) + art + '"' : line + art;
}
export function celesteLine(state, extras) {
  const s = forkState(state), surp = surpriseMemory(extras, 'celeste'), count = talkCount(s, null, 'celeste');
  if (muralCompleted(s)) {
    const options = [say(CELESTE_LINES.completed[0], muralCompositionReply(s, extras)), ...CELESTE_LINES.completed.slice(1).map(shown)];
    const lay = s.opened === true ? layoutMemory(s, 'celeste') : '';
    if (lay) options[3] = shown(lay);
    if (surp) options[4] = quoted('celeste', surp);
    return options[lineIndex(count, options.length)];
  }
  const options = CELESTE_LINES.before.map(shown);
  if (surp) options[4] = quoted('celeste', surp);
  return options[lineIndex(count, options.length)];
}
// music: {mode: 'sketch' | 'local', localName}. A loaded local track replaces every line.
export function rookLine(state, extras, talk, music = {}) {
  const s = forkState(state);
  if (music?.mode === 'local' && music.localName) return say(ROOK_LINES.local, music.localName);
  const surp = surpriseMemory(extras, 'rook'), count = talkCount(s, talk, 'rook');
  if (muralCompleted(s)) {
    const options = ROOK_LINES.completed.map(shown), lay = s.opened === true ? layoutMemory(s, 'rook') : '';
    if (lay) options[3] = shown(lay);
    if (surp) options[4] = quoted('rook', surp);
    return options[lineIndex(count, options.length)];
  }
  const options = [say(ROOK_LINES.before[0], activeStemSummary(s)), ...ROOK_LINES.before.slice(1).map(shown)];
  if (surp) options[4] = quoted('rook', surp);
  return options[lineIndex(count, options.length)];
}
// The line a neighbor says at their current turn (talk_with_neighbor routing).
export function spokenLine(state, extras, talk, id, music = {}) {
  if (id === 'celeste') return celesteLine(state, extras);
  if (id === 'rook') return rookLine(state, extras, talk, music);
  return greetingLine(state, extras, talk, id);
}

const blockReady = s => list(s.visited).filter(id => NEIGHBOR_IDS.includes(id)).length >= NEIGHBOR_IDS.length && muralCompleted(s) && s.soundcheck === true;
// update_block_ui / update_mural_ui / update_music_ui header for whoever is talking.
// opts: {narrow, music: {playing, mode, localName}}.
// Rook's status words agree with the soundcheck and the music they describe: each has its own context (scripts/i18n.mjs CONTEXTS).
const soundcheckStatus = s => s.soundcheck === true ? L(PANEL_TEXT.scReady, 'characters.PANEL_TEXT.scReady') : L(PANEL_TEXT.scPending, 'characters.PANEL_TEXT.scPending');
const musicStatus = playing => playing ? L(PANEL_TEXT.playing, 'characters.PANEL_TEXT.playing') : L(PANEL_TEXT.paused, 'characters.PANEL_TEXT.paused');
export function panelHeader(state, extras, talk, id, opts = {}) {
  const s = forkState(state), narrow = opts.narrow === true, P = PANEL_TEXT, sparks = sparkCount(s, extras), turn = turnNumber(talkCount(s, talk, id)), p = person(id);
  if (!p) return '';
  if (id === 'celeste') {
    const tag = muralCompleted(s) ? L(P.easelComplete) : gdFormat(P.easelCount, placedMotifs(s));
    return narrow ? gdFormat(P.celesteNarrow, turn, sparks) : gdFormat(P.celesteHeader, L(NEIGHBOR_BADGES.celeste), turn, tag, paletteName(s.palette ?? 'garden'), sparks);
  }
  if (id === 'rook') {
    const m = opts.music ?? {}, mode = m.mode === 'local' ? gdFormat(P.local, m.localName ?? '') : L(P.sketch);
    return narrow ? gdFormat(P.rookNarrow, turn, sparks) : gdFormat(P.rookHeader, L(NEIGHBOR_BADGES.rook), turn, musicStatus(m.playing), mode, soundcheckStatus(s), sparks);
  }
  const tag = L(s.opened === true ? P.openTag : blockReady(s) ? P.readyTag : P.prepareTag), met = list(s.visited).filter(i => NEIGHBOR_IDS.includes(i)).length;
  const mural = muralCompleted(s) ? L(P.muralReady) : gdFormat(P.muralCount, placedMotifs(s));
  return narrow ? gdFormat(P.headerNarrow, L(p.name), turn, sparks) : gdFormat(P.header, L(p.name), L(p.role), L(NEIGHBOR_BADGES[id]), turn, tag, met, NEIGHBOR_IDS.length, mural, sparks);
}
// A speech line without its speaker's name (Celeste's and Rook's narrow detail). English trims the English name, as Godot does;
// a locale trims the line's own speaker envelope, whatever the name is in that language.
const afterSpeaker = (line, name) => isEnglish() ? trimPrefix(line, `${name}: `) : String(line).replace(/^[^\n:"]{1,40}: (?=")/, '');
// The conversation's spoken detail: the line (or a custom line, Godot last_panel_dialogue) plus its
// memory tail. Celeste and Rook lead with the tail when narrow, as Godot does.
export function panelDetail(state, extras, talk, id, opts = {}) {
  const s = forkState(state), narrow = opts.narrow === true, custom = typeof opts.custom === 'string' && opts.custom ? opts.custom : '';
  const line = custom || spokenLine(s, extras, talk, id, opts.music), count = talkCount(s, talk, id), name = person(id)?.name ?? '';
  if (custom && !['celeste', 'rook'].includes(id)) return custom;
  const tail = memoryTail(s, extras, id, line, count);
  if (id === 'celeste' || id === 'rook') {
    if (!tail) return line;
    return narrow && !custom ? gdFormat(id === 'celeste' ? PANEL_TEXT.celesteNarrowSpoken : PANEL_TEXT.rookNarrowSpoken, tail, afterSpeaker(line, name)) : gdFormat(PANEL_TEXT.spokenJoin, line, tail);
  }
  const spoken = tail ? gdFormat(PANEL_TEXT.spokenJoin, line, tail) : line;
  return narrow ? spoken : say(PANEL_TEXT.detail, spoken, L(name));
}
// Rook's music detail line (update_music_ui), around panelDetail's spoken text.
export function rookMusicDetail(state, spoken, music = {}) {
  const s = forkState(state);
  if (music?.mode === 'local') return gdFormat(PANEL_TEXT.rookLocalDetail, music.localName ?? '', spoken);
  return gdFormat(PANEL_TEXT.rookSketchDetail, soundcheckStatus(s), activeStemSummary(s), spoken);
}
// The three fixed conversation buttons, with Godot's narrow labels. Keep Chatting is rapid.
export function conversationButtons(narrow = false) {
  const B = BUTTON_TEXT;
  return [
    { id: 'chat', label: narrow ? L(B.chatNarrow) : shown(B.chat), rapid: true },
    { id: 'next', label: L(narrow ? B.nextNarrow : B.next), rapid: false },
    { id: 'bye', label: L(narrow ? B.byeNarrow : B.bye), rapid: false },
  ];
}
// Rook's music panel buttons (update_music_ui). music: {playing, mode, volume 0..1}. Volume is rapid, as Godot marks music_vol_btn.
export function rookButtons(state, music = {}, narrow = false) {
  const s = forkState(state), B = BUTTON_TEXT, done = s.soundcheck === true, sketch = music?.mode !== 'local';
  return [
    { id: 'play', label: L(music?.playing ? B.pause : B.play) },
    { id: 'volume', label: gdFormat(B.volume, Math.round(Math.max(0, Math.min(1, Number(music?.volume) || 0)) * 100)), rapid: true },
    { id: 'soundcheck', label: L(narrow ? (done ? B.rookDoneNarrow : B.rookCheckNarrow) : (done ? B.rookDone : B.rookCheck)) },
    { id: 'sketch', label: L(narrow ? (sketch ? B.sketchActiveNarrow : B.sketchUseNarrow) : (sketch ? B.sketchActive : B.sketchUse)) },
    { id: 'next', label: L(narrow ? B.hint : B.next) },
    { id: 'bye', label: L(narrow ? B.close : B.bye) },
  ];
}

// A label in the active language with the template and arguments it came from, so narrowLabel can find a locale's narrow
// variant: a fixed label through the catalog, or the template filled (gdFormat looks it up).
const labelOf = (template, ...args) => ({ label: args.length ? gdFormat(template, ...args) : template ? L(template) : template, template, args });
// The hub labels conversation_actions borrows for programme, civic and film.
function programmeParts(s) {
  const H = HUB_LABELS;
  if (isHostingDone(s)) return labelOf(H.programmeDone);
  if (list(s.hosting?.order).length) return labelOf(H.programmeHost, list(s.hosting?.results).length);
  if (list(s.programme?.published).length === PROGRAMME_SEGMENTS.length) return labelOf(H.programmeStart);
  if (list(s.programme?.order).length) return labelOf(H.programmeDraft, list(s.programme.order).length);
  return labelOf(H.programme);
}
function civicParts(s) {
  const phase = s.civic?.phase, H = HUB_LABELS;
  return labelOf(phase === 'done' ? H.civicDone : phase === 'meeting' ? H.civicMeeting : phase === 'planning' ? H.civicPlanning : H.civic);
}
function filmParts(s, screenFrame = 0) {
  const film = s.film ?? {}, H = HUB_LABELS;
  if (film.phase === 'done') return labelOf(H.filmDone, Math.trunc(Number(screenFrame) || 0) + 1);
  if (film.phase === 'shooting') return labelOf(H.filmShooting, list(film.captured).length);
  if (film.phase === 'hold') return labelOf(H.filmHold);
  if (film.phase === 'planning') return labelOf(H.filmPlanning);
  return labelOf(H.film);
}
export const programmeLabel = state => programmeParts(forkState(state)).label;
export const civicLabel = state => civicParts(forkState(state)).label;
// screenFrame: the film screening frame being watched (session-only), 0-based.
export const filmLabel = (state, screenFrame = 0) => filmParts(forkState(state), screenFrame).label;
// A narrow variant filled as i18n.js format fills a translation: %s and %d in order or by position (%2$s), %% as %, each value
// isolated in RTL (a ratio as one run).
const fillVariant = (text, args) => fillTranslated(text, args, FLAVORS.characters);
// apply_block_panel_mode's narrow labels. English runs Godot's .replace chain on the label. A locale shows the catalog's narrow
// variant of the label's template (its narrow section is keyed by the wide English template, docs/I18N_PLAN.md 2.4), filled
// with the same arguments, else the wide label: the English rewrites never run on translated text. A label given alone is its
// own template (a fixed table label, as game.js passes one).
export function narrowLabel(label, template = label, args = []) {
  if (isEnglish()) return NARROW_LABEL_REWRITES.reduce((text, [from, to]) => text.split(from).join(to), String(label));
  const variant = narrow(template);
  if (variant !== undefined) return fillVariant(variant, Array.isArray(args) ? args : []);
  return template === label && label ? L(label) : String(label);
}

// conversation_actions for the neighbor being talked to: up to three context actions, then (Godot's
// last slot) All Block Actions. goal is story.js nextObjective(state, world); ids are Godot's, with
// walk_neighbor:<neighbor id> and return_owner:<loan id>. opts: {narrow, screenFrame}.
export function conversationActions(state, extras, talk, partner, goal, opts = {}) {
  const s = forkState(state), e = extrasOf(extras), A = ACTION_LABELS, visited = new Set(list(s.visited));
  const g = goal ?? nextObjective(s), acts = [];
  // Each action keeps its label's template and arguments (labelOf) for narrowLabel; the result holds only id and label.
  const add = (id, parts) => acts.push({ id, ...parts });
  const done = () => acts.map(({ id, label, template, args }) => ({ id, label: opts.narrow === true ? narrowLabel(label, template, args) : label }));
  if (g.id === 'layout') {
    add('layout_table', labelOf(A.layoutTable)); add('layout_floor', labelOf(A.layoutFloor)); add('hub', labelOf(A.hub));
    return done();
  }
  const loan = conversationLoan(s, partner, talk?.confirmedLoan ?? '');
  if (loan) add(`return_owner:${loan}`, labelOf(list(s.epilogue?.returned).includes(loan) ? CHARACTER_COMPOSE.returned : CHARACTER_COMPOSE.return, L(LOAN_TITLES[loan])));
  const surprisesLeft = e.surprises.size < SURPRISE_IDS.length, spot = () => add('surprise', labelOf(A.surprise, e.surprises.size, SURPRISE_IDS.length));
  switch (g.id) {
    case 'meet': add(`walk_neighbor:${g.neighbor}`, labelOf(A.meet, L(NEIGHBOR_NAMES[g.neighbor]))); break;
    case 'mural': add('mural', labelOf(A.mural)); break;
    case 'soundcheck': add('soundcheck', labelOf(A.soundcheck)); break;
    case 'open': add('open', labelOf(A.open)); break;
    case 'photo': add('epilogue', labelOf(A.photo)); break;
    case 'pack': case 'return': if (!loan) add('epilogue', g.id === 'pack' ? labelOf(A.pack) : labelOf(A.returnGear, list(s.epilogue?.returned).length)); break;
    case 'programme': add('programme', programmeParts(s)); break;
    case 'civic': add('civic', civicParts(s)); break;
    case 'film': add('film', filmParts(s, opts.screenFrame)); break;
    case 'comptons': add('comptons', labelOf(A.comptons)); break;
    case 'blackhawk': add('blackhawk', labelOf(A.blackhawk)); break;
    // Godot's _: the explore goal, or an active story episode's: Spot Surprise while any is left, else the
    // landmark tour's next stop under its tour_action when the goal has one, else Visit the Museum.
    default: if (surprisesLeft) spot(); else if (g.tourId) add('landmark_tour', labelOf(String(g.tourAction ?? ''))); else add('museum', labelOf(A.museum));
  }
  if (hasHosted(s, 'art') && partner === 'dez') {
    add('shared_panel', labelOf(A.sharedPanel)); add('hub', labelOf(A.hub));
    return done();
  }
  const n = NEIGHBOR_IDS.length, at = Math.max(0, NEIGHBOR_IDS.indexOf(partner)), first = acts[0]?.id ?? '';
  let other = -1;
  for (let i = 0; i < n; i++) { const c = posmod(at + 1 + i, n); if (c !== at && !visited.has(NEIGHBOR_IDS[c])) { other = c; break; } }
  if (other < 0) other = posmod(at + 1, Math.max(1, n));
  for (let i = 0; i < n; i++) { const c = posmod(at + 1 + i, n); if (c !== at && `walk_neighbor:${NEIGHBOR_IDS[c]}` !== first && !visited.has(NEIGHBOR_IDS[c])) { other = c; break; } }
  const otherId = `walk_neighbor:${NEIGHBOR_IDS[other]}`;
  if (first !== otherId && other !== at && !visited.has(NEIGHBOR_IDS[other])) add(otherId, labelOf(A.talkTo, L(NEIGHBOR_NAMES[NEIGHBOR_IDS[other]])));
  else if (s.history !== true && first !== 'comptons') add('comptons', labelOf(A.plaque));
  else if (s.blackhawk !== true && first !== 'blackhawk') add('blackhawk', labelOf(A.blackhawk));
  else if (surprisesLeft && first !== 'surprise') spot();
  else if (g.id === 'explore' && !surprisesLeft) add('eateries', labelOf(A.eateries));
  else if (first !== otherId && other !== at) add(otherId, labelOf(A.talkTo, L(NEIGHBOR_NAMES[NEIGHBOR_IDS[other]])));
  else add('museum', labelOf(A.museum));
  add('hub', labelOf(A.hub));
  return done();
}

// What's Next?, as story.js ports ask_whats_next, plus Godot's announcement for it.
export const whatsNext = (goal, speakerId) => whatsNextLine(goal, speakerId);
export const whatsNextAnnouncement = (goal, speakerId) => gdFormat(CAPTION_TEXT.whatsNextA11y, goal?.text ?? '', hintFor(goal, speakerId));
// The announcement after a talk: the line, then its tail.
export function talkAnnouncement(state, extras, talk, id, music = {}) {
  const line = spokenLine(state, extras, talk, id, music), tail = memoryTail(state, extras, id, line, talkCount(state, talk, id));
  return tail ? gdFormat(CAPTION_TEXT.spokenWithTail, line, tail) : line;
}
// finish_neighbor_arrival's announcement for each neighbor.
export function arrivalCaption(state, extras, talk, id, music = {}) {
  const s = forkState(state), p = person(id);
  if (!p) return '';
  const line = spokenLine(s, extras, talk, id, music), tail = memoryTail(s, extras, id, line, talkCount(s, talk, id)), more = tail ? ' ' + tail : '';
  if (id === 'celeste') return gdFormat(CAPTION_TEXT.arrivedCeleste, L(p.name), L(p.role), placedMotifs(s), more);
  if (id === 'rook') return gdFormat(CAPTION_TEXT.arrivedRook, L(p.name), L(p.role), L(s.soundcheck === true ? CAPTION_TEXT.soundReady : CAPTION_TEXT.soundTap), more);
  return gdFormat(CAPTION_TEXT.arrived, L(p.name), L(p.role), list(s.visited).filter(i => NEIGHBOR_IDS.includes(i)).length, more);
}
export const talkingSubline = id => { const p = person(id); return p ? gdFormat(CAPTION_TEXT.talking, L(p.name), L(p.role), L(p.name)) : ''; };
export function goodbyeLines(id, goal) {
  const who = L(person(id)?.name ?? CAPTION_TEXT.goodbyeNobody);
  return { text: gdFormat(CAPTION_TEXT.goodbye, who), announcement: gdFormat(CAPTION_TEXT.goodbyeA11y, who, goal?.text ?? '') };
}
// Godot draws each character's panel border in coat.lightened(0.24).
export function panelBorder(id) {
  const coat = person(id)?.coat;
  if (!coat) return '';
  const rgb = [1, 3, 5].map(i => parseInt(coat.slice(i, i + 2), 16) / 255).map(c => c + (1 - c) * 0.24);
  return '#' + rgb.map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('');
}
// One snapshot of everything a conversation dialog shows, for game.js to render.
export function conversationView(state, extras, talk, id, goal, opts = {}) {
  const s = forkState(state), p = person(id);
  if (!p) return null;
  const count = talkCount(s, talk, id), line = spokenLine(s, extras, talk, id, opts.music);
  return {
    id, name: L(p.name), role: L(p.role), badge: L(NEIGHBOR_BADGES[id]), turn: turnNumber(count), border: panelBorder(id),
    header: panelHeader(s, extras, talk, id, opts), line, tail: memoryTail(s, extras, id, line, count),
    detail: panelDetail(s, extras, talk, id, opts), spoken: spokenText(line),
    buttons: conversationButtons(opts.narrow === true), actions: conversationActions(s, extras, talk, id, goal, opts),
    music: id === 'rook' ? rookButtons(s, opts.music, opts.narrow === true) : null,
  };
}
