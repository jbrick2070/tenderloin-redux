// Every ending string, copied verbatim from the Godot sources named by each group (file, then function).
// tests/next-ending.test.mjs reads those sources at test time: each string here must be one Godot literal of
// its function, every long literal of a listed function must be copied here, and the constants must deep-equal.
// Where Godot names something 2D lacks (an import, F-keys), ENDING_WEB_OVERRIDES maps the Godot literal to the
// fork's line, and web() applies it. Nothing else changes Godot's wording.
//
// Intentional rule divergence (not text): Godot refuses every ending surface while the player is walking
// ("Finish arriving…"). 2D opens them from the afterglow and the host's stopWalk() stops the walk first.
export const GODOT = {
  'hosted_afternoon.gd': {
    detail: {
      none: 'No copied contribution is available. The saved gathering stays unchanged.',
      heading: '%s was %s in the afternoon we hosted.',
      unavailable: '\nThe copied choice is unavailable. The saved gathering stays unchanged.',
      storiesResult: 'Copied invitation: ',
      storiesMemory: 'You made room for a small moment, and passing was welcome. No personal story was recorded.',
      storiesFuture: 'You left room for something we hoped to make. Listening counted too. No personal story was recorded.',
      beatsNone: 'Copied rhythm: listening only, with no marked beats.',
      beatsSome: 'Copied rhythm: %d taps in eight slots, at %s.',
      beatsNoneReply: 'You gave listening a place without asking anyone to make a beat.',
      beatsSomeReply: 'You gave us %d taps in eight slots. I kept the spaces between them too.',
      artResult: 'Copied panel: %s colors and six arranged shapes.',
      artWarm: 'Our six shapes stay in warm colors, just as we hung them.',
      artCool: 'Our six shapes stay in cool colors, just as we hung them.',
      pauseResult: 'Copied seating: ',
      pauseArc: 'You kept an open arc, with the cushion marking a place. Coming and going were welcome.',
      pausePairs: 'You kept a pair and an open seat, with the cushion marking a place. Coming and going were welcome.',
    },
    invitation: {
      done: "The Listening Hour is complete. Its remembered voices and Dez's offer remain in Listening Hour (F5).",
      opening: 'Our afternoon began with %s and ended with %s.',
      idle: 'I would like to make room for a Listening Hour too, when you are ready.',
      planning: 'Your Listening Hour plan is still there. We can return to it at your pace.',
      meeting: 'The Listening Hour is open. We can return to the conversation without closing it.',
    },
  },
  'programme_studio.gd': {
    description: {
      copiedOrder: '\nCopied order: ',
      follow: '\nFollow takes you to the Listening Hour button; open it when ready. Keep exploring leaves this offer with your completed gathering.',
      picture: '\nPicture: ',
      pictureTail: '. Draft and Posted keep the first afternoon unchanged. Posting alone does not start another gathering. Posted offers Gather again for this visit.',
      postedGather: 'Posting alone does not start another gathering. Posted offers Gather again for this visit; the first afternoon stays unchanged.',
    },
    hosted_picture_description: {
      stories: 'the copied invitation picture, not a personal story',
      art: 'the six copied shapes and palette, unchanged by future revisions',
      order: 'the copied hosted order',
    },
    order_text: { none: 'no cards yet', join: ' -> ' },
    refresh: {
      heading: 'Programme Studio | ', hosted: 'Afternoon hosted',
      credit: 'Fictional hosted gathering | City/PDDL | OSM/ODbL',
      follow: 'Follow this invitation', complete: 'Listening complete', draft: 'Draft', keep: 'Keep exploring', back: 'Back',
      musicOn: 'Music: On', musicOff: 'Music: Off',
    },
    follow_hosted_invitation: { focused: ' Listening Hour is focused. Open that button when you are ready; your plan and conversation are unchanged.' },
    close_studio: {
      back: 'Back to the block. ',
      gathering: 'Your gathering stays this visit. Open Programme Studio, Posted, then ',
      gatheringTail: '. Reload or successful import clears this visit, not the original afternoon.',
      offer: "Bea's offer stays with your completed gathering.",
      remain: 'Your completed gathering and Listening Hour remain available.',
    },
  },
  'programme_gathering.gd': {
    title: { gather: 'Gather again', revisit: 'Revisit gathering', resume: 'Resume gathering' },
    prepare: {
      plan: 'Gathering not started: finish the first afternoon and post a valid four-part plan. Your previous visit stays intact.',
      copy: 'Gathering not started: an original copied contribution is unavailable. Your previous visit and saved afternoon stay intact.',
      pictures: 'Gathering not started: the original pictures could not be prepared. Your previous visit stays intact.',
    },
    back_to_studio: { back: 'Back to Posted. ', tail: " keeps this visit's copied order and handoffs, even if you edit or repost." },
    handoff: { copied: 'New visit copied. ' },
    advance: { complete: 'Gathering complete this visit. ' },
    contribution: {
      stories: 'Bea: Our invitation, "%s", is the original copy. No personal story or notes were recorded.',
      beatsNone: 'Dez: Listening only, zero marked beats. The empty slots are welcome.',
      beatsSome: 'Dez: Our original taps stay in slots %s. The picture is silent; the spaces count too.',
      art: 'Celeste: These are our original six shapes in %s colors, in their original arrangement.',
      pause: 'Thanh: Our original %s still leaves a place for someone to join or pass.',
      arc: 'open arc', pairs: 'pair and open seat',
    },
    closure: { text: "Bea: We carried the welcome through all four parts. Listening Hour, the film and the ending keep our first afternoon's records. This gathering and its handoffs stay only for this visit." },
    description: {
      choose: '\nChoose how to welcome the next resident.',
      all: '\nAll four contributions are here. Finish gathering when you are ready.',
      order: '\nCopied order: ',
      same: 'The same order as our first afternoon, with a new welcome.',
      different: 'A different order, with our original contributions.',
      help: '\nInvite joins turns; Make room holds an opening. Back edits the pinboard without changing this copy. Keep exploring retains it under Posted. Reload or successful import clears this visit; the saved afternoon keeps the invitation.',
    },
    refresh: {
      heading: 'Gather again | ', revisited: 'Afternoon revisited', four: 'A welcome in four parts',
      credit: '\nFictional gathering | Original copies | This visit only',
      invite: 'Invite ', room: 'Make room', newVisit: 'New visit', newPlan: 'New posted plan',
      next: 'Next handoff', complete: 'Complete', finish: 'Finish gathering',
    },
    setup: { previous: 'Previous', back: 'Back to Posted', keep: 'Keep exploring' },
    _draw: { opening: 'Opening', invite: 'Invite', room: 'Make room', notYet: 'Not yet' },
  },
  'civic_listening.gd': {
    close_hour: { offer: "Back to the block. Dez's offer stays in the Listening Hour with your completed progress." },
    follow_invitation: { invitation: "Dez's invitation: ", tail: '. Choose this film action when you are ready; your film is unchanged.' },
    request_text: {
      themes: 'Authored shared request (not sent; no names or testimony collected): ',
      none: 'No meeting notes. Nothing is recorded or sent; this fictional conversation is not a record of real people.',
    },
    refresh: {
      beginning: '\nOne listening hour is a beginning, not a promise that housing problems are solved.',
      ready: '\nThe film is ready to revisit.',
      standing: "\nDez's standing invitation: make The Open Seat together.",
      follow: " Follow takes you to '", followTail: "'; choose that action when you are ready. Your film stays as you left it. Keep exploring retains this offer with your completed progress.",
      remembered: '\nRemembered turn:\n',
      revisit: 'Revisit the film', followButton: 'Follow this invitation', keep: 'Keep exploring',
    },
  },
  'main.gd': {
    // The capture that finishes the film: Dez's Helper workshop invitation follows the summary.
    film_capture_shot: {
      cue: 'The Open Seat 3/3',
      summary: 'Captured %s (%d/3 frames)%s',
      complete: ' — The Open Seat Complete!',
      info: '%s\nM4 Three-Shot Film Short (The Open Seat) · Sound-independent\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL',
      invitation: 'Dez: Our film is finished. Want to imagine a helper for a future neighborhood? Watch the film, then choose Helper workshop. Or keep exploring; your invitation stays.',
    },
    civic_completion_acknowledgment: {
      themes: 'You kept our shared request without names or testimony.',
      none: 'You left the notebook closed; our conversation did not become a record of each other.',
      filmDone: 'Thank you for making The Open Seat. We can watch it again whenever you like.',
      filmLater: 'I would like to make The Open Seat with you, at your pace.',
      line: 'Dez: "You made a %s for %s. %s %s"',
    },
    mural_scene_reply: {
      empty: 'A meal, a painter, a guitarist or neighbors growing plants can tell another story here.',
      on: '%s on the %s', join: ', ', tail: '. You made room for everyday creativity.',
    },
    edit_mural_scene: {
      already: '%s is already on the %s.',
      full: 'Your existing save is full; this scene was not changed.',
      lifted: 'Lifted the %s scene.', painted: '%s painted on the %s.', celeste: ' Celeste: ',
    },
    mural_neighbor_reply: {
      dez: ' That painted guitar leaves room for a quiet song, too.',
      thanh: ' Two pairs of hands tending that painted planter. Growing something takes neighbors, too.',
    },
    save_receipt: { saved: 'Saved to Godot storage.', visit: 'Visit-only: %s; reload may lose changes.' },
    // Mural Stories' Palette button (cycle_mural_palette). info is Godot's 3D info panel, which 2D does not draw.
    set_mural_palette: {
      announce: 'Portable Mural Board palette set to %s (%d/3 motifs).',
      info: 'Portable Mural Board palette set to %s with Celeste (%d/3 motifs)\nFreestanding sidewalk easel · %s\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL',
    },
  },
  'film_screening.gd': {
    setup: { credit: 'Original illustrated short | DataSF/PDDL | OSM/ODbL', back: 'Back to the block', helper: 'Helper workshop' },
    description: { line: '%s. Original illustrated props%s.', wide: " and Celeste and Dez's volunteered fictional hands", close: ', with no people pictured' },
    refresh: {
      title: 'The Open Seat | %d / 3',
      text: '%s\n%s\n%s | %s\nYour ending is %s. The copied order, framing and production choice are remembered.\nSilent illustrated sequence, not a recorded movie. Music stays yours to choose. No real camera, microphone, permit or recording.\nDez: We ended on %s. A different order would tell a different little story.',
      helper: '\nDez: Want to imagine a helper for a future neighborhood? Choose Helper workshop to build a stand for our three pictures. Or keep exploring; this invitation stays with your finished film.',
      frame: 'Frame %d of 3: %s%s', selected: ', selected',
      announce: 'The Open Seat. Frame %d of 3. %s %s Silent illustrated sequence. Music is independent.',
    },
    close_screening: { back: 'Back to the block. Your copied film and soundtrack are unchanged.' },
    open_screening: { refuse: 'Finish the three-shot film, arriving and any chapter card before watching The Open Seat.' },
  },
  'helper_bench.gd': {
    setup: {
      title: 'Tenderloin to the Stars | Helper bench', credit: 'Speculative future | Fictional neighbors | This visit only',
      left: 'Fit left support', right: 'Fit right support', lift: 'Ask helper to lift', keep: 'Keep exploring', habitat: 'Habitat room',
    },
    open_bench: { refuse: 'Finish your film and arriving, then close the current activity before visiting the helper bench.' },
    open_habitat: { refuse: 'Finish arriving or the pending activity before arranging the habitat copies. The helper bench stays open.' },
    close_bench: { back: 'Back to the block. Your helper bench stays this visit. Watch your film to return; reload or a successful import clears the bench, not your invitation.' },
    description: {
      line: '%s jig: left support %s; right support %s. %s', fitted: 'fitted', empty: 'empty',
      done: 'The helper has placed three copied film pictures and parked.', waits: 'The helper waits for your instruction beside the unmounted frames.',
      low: ' The low illustration is foreshortened to show its tilt.',
    },
    refresh: {
      intro: "Dez: Celeste and I imagine a little helper built by the neighbors. Let's give it a useful first job: lift our three film pictures onto a stand for a future neighborhood.\nChoose a display, then fit both supports in either order. Only you can ask the helper to lift. There is no timer.",
      partial: 'Dez: Good, the %s has %s. Fit the remaining support, then ask our helper to lift the pictures. It waits for you.',
      both: 'both supports', one: 'one support',
      complete: 'Dez: Your %s holds all three pictures, ending on %s. You fitted the supports; our helper lifted the frames and parked. That is a small job we can share.\nWe can imagine a home around what our neighbors made. Our habitat room model is ready to arrange; a welcomed room now offers Prepare together and a speculative departure. The departure opens the walkable orbital commons, a final gathering and an authored return. You can try the other display here, or keep exploring.',
      copied: "\nCopied order: %s. %s; %s. These are the film's original illustrations, separate from Celeste's hosted tile panel.\nThis is speculative fiction, not a present-day robot or launch claim. Assembly and display last this visit only. Reload or a successful import keeps your earned invitation from the completed film, and starts this bench fresh. Music, saved work and the street camera stay yours.",
      habitat: '\nHabitat room opens a separate room of copies from your completed film and hosted choices. You may arrange it now or after this bench; constructing the stand is optional. Its arrangement also lasts this visit only.',
      revisit: 'Revisit finale', habitatLabel: 'Habitat room', parked: 'Helper parked', lift: 'Ask helper to lift', join: ' / ',
    },
  },
  'habitat_room.gd': {
    departure_action: {
      wrong: '%s: My link faces our %s by %s. Across is the same row; Along is the same column; Corner is diagonal. Try another side; nothing is lost.',
      right: "%s: That faces our %s by %s. My piece fits with the other neighbors' links.",
    },
    departure_text: {
      intro: "Bea: The place you left open can welcome whoever comes next. Each neighbor's link faces their copy: Across for the same row, Along for the same column, Corner for diagonal. Choose a neighbor, choose a relation, then Fit link.",
      all: 'Bea: All three links belong together. My folded invitation keeps the middle open: ', allTail: '. Choose Ready together when you want to gather.',
      ready: 'Bea: "Our invitation is %s. We leave space for someone new."\nCeleste: "Our six shapes keep their %s colors by %s."\nDez: "Our film ends on %s. %s"\nThanh: "We keep the %s and our %s Listening Hour. We are ready together."',
      beatsNone: 'Listening only, with no marked beats.', beatsSome: 'Our original eight rhythm slots travel silently.',
      panel0: 'Bea: We have made a place for one more. In this speculative future chapter, our neighbors travel together with copies of what we made. The originals, borrowed things and our home block stay home.',
      panel1: 'Thanh: The neighborhood travels with us: a place to pause, our pictures, our film and room for someone new. We can take our time. This still image is fictional transport, not a real launch or technology claim.',
      panel2: "Dez: Above Earth, we still have a neighborhood to make together. Celeste's shapes, our film and Thanh's seats have come with us. Bea keeps the open place for whoever arrives next. Choose Walk orbital to explore the commons and share a view with Thanh. After sharing a view, Gather here brings everyone together. Finish that gathering to choose memories, exploration or an authored return.",
      open: '\nOpen place: ', links: '. %d of 3 links fitted. ', ready2: 'Ready together. ', title: "Bea's copied title: ",
      tail: '. No personal story or meeting notes are shown.\nThis is speculative fiction, not a certified access plan. All reveal panels are still and captioned; Next panel and Skip reveal reach the same final panel. Back to room keeps your arrangement. Moving a copy removes these links and readiness; selection alone does not. Keep/Escape returns to the block and retains this visit only. Reload or successful load/import starts fresh; your completed film keeps the invitation. Music and the street camera stay yours.',
    },
    setup: {
      title: 'Tenderloin to the Stars | A room for one more', credit: 'Speculative room model | Copies | This visit only',
      ask: 'Ask helper', view: 'View detail', keep: 'Keep exploring',
    },
    open_room: { refuse: 'Finish your film and arriving, then close the current activity before arranging the habitat copies.' },
    close_room: {
      returned: 'Future chapter paused. Your return home is already complete this visit. ',
      paused: "Future chapter paused. Today's block is visible again; this pause does not complete the authored return-home journey. ",
      back: 'Back to the block. ',
      tail: 'Your room arrangement, departure preparation and local walking stay this visit, with movement stopped. Watch your film, then open the helper bench to revisit. Reload or successful import starts a fresh arrangement; your film keeps the invitation.',
    },
    choose_item: { linked: '%s: My link is already fitted. Choose another neighbor, or Ready together once all three fit.' },
    carry_or_welcome: { failed: 'The copied pictures could not open. Your departure is kept; try Walk orbital again.' },
    item_name: { open: 'open place' },
    description: { welcomed: 'Room welcomed. ', placed: '%d of 3 copies placed. ', join: '; ', tail: '. The central passage stays clear.' },
    refresh: {
      future: 'Speculative future chapter', model: 'Speculative room model', credit: ' | Copies | This visit only',
      intro: 'Thanh: Let us arrange copies in a shared room we imagine visiting together. Choose Art, Film or Seats, choose an empty place, then ask our helper to carry. Leave a place open for someone else.\nSuggested arrangement, not a remembered choice: art by Entry, seats by Window, film at Far wall. You decide.',
      partial: 'Thanh: %s Choose another copy or move one into the open place. Our helper waits for your instruction.',
      all: 'Thanh: All three copies have a place. You can rearrange them through the spare place, or deliberately welcome me to the room.',
      complete: 'Thanh: "You left the %s open. Our %s has room to pause, and the middle stays clear."\nCeleste: "Our six shapes are by %s, in their original %s colors."\nDez: "Our film is by %s, ending on %s. The originals stay on the block."',
      arc: 'open arc', pairs: 'pair and open seat',
      selected: '\nSelected: ', for: ' for ', selectedTail: '. View detail enlarges the selected copy; it does not place it.',
      copies: '\nCopied seats: %s. Listening Hour format: %s. Copied rhythm: %s. No personal stories or meeting notes are pictured.',
      beatsNone: 'listening only, no marked beats', beatsSome: 'the original marked slots, shown silently',
      model2: '\nThis is a speculative room model, not a walkable habitat or certified access plan. Copies travel in our imagination; originals, borrowed things and home stay on the block. Welcome the room, then Prepare together to build the open-place frame and depart in a speculative future chapter. The final departure panel invites you to walk the orbital commons. Sharing a view in the commons offers a separate gathering and authored return. Show room returns from a detail; Escape or Keep returns to the block from either view. This arrangement lasts this visit only; reload or successful load/import starts it fresh. Your completed film keeps this invitation. Quiet, saved work and the street camera stay yours.',
      detailOf: 'Detail of ', roomModel: 'Room model. ', placedName: ' placed', unplacedName: ' unplaced',
      ask: 'Ask helper', prepare: 'Prepare together', welcome: 'Welcome Thanh', show: 'Show room', view: 'View detail',
      nextPanel: 'Next panel', skip: 'Skip reveal', still: 'Still panels', backRoom: 'Back to room',
      walk: 'Walk orbital', depart: 'Depart', readyTogether: 'Ready together', fit: 'Fit link',
      frame: 'Open-place frame. ', panel: 'Departure panel %d of 3.', linksFitted: '%d links fitted.',
    },
  },
  'orbital_commons.gd': {
    setup: { heading: 'Tenderloin to the Stars | Walk the commons\nSpeculative future chapter | Copies | This visit only', invite: 'Invite Thanh', stop: 'Stop', back: 'Back to departure', pause: 'Pause chapter', walk: 'Walk to ' },
    halt: {
      thanh: 'Thanh paused on the path. Invite him again when you want to continue.',
      stopped: 'Stopped here. Choose a place to walk again; nobody moves while you read.',
    },
    walk_to: {
      here: 'You are by ', hereTail: '. Invite Thanh when you want to share this view.',
      walking: 'Walking to ', walkingTail: '. Stop or focus the reading panel to pause. Arrival does not invite anyone.',
    },
    invite_thanh: {
      join: 'Thanh: I will join you by ', joinTail: '. You chose what to share; we can take our time.',
      beside: 'Thanh is already beside this view. You chose to share it together.',
    },
    response: {
      waits: 'Thanh waits on the path. Choose what you want to share with him.',
      art: "Thanh: You brought me to Celeste's six shapes. We can look at the spaces between them together. Celeste: These are our original ",
      artTail: ' colors and arrangement; nothing has been repainted.',
      film: 'Thanh: You brought me to our film. I can follow its three pictures at my own pace. Dez: Our copied film ends on ',
      filmTail: ', with its original order and framing. ',
      beatsNone: 'We listen without marked beats.', beatsSome: 'Our eight rhythm slots are shown silently.',
      seats: 'Thanh: You chose a place to pause together: ', seatsMid: '. Our ',
      seatsTail: ' Listening Hour has room for another neighbor. Bea: We keep the invitation open. Gather here is a separate choice when you are ready.',
    },
    recognition: {
      returned: "You finished the imagined orbital afternoon and its return to today's block. This visit's memories and commons remain available.",
      completed: 'The orbital gathering is complete this visit. Your authored return is still a separate choice.',
    },
    acknowledgments: {
      gathered: 'A little later, everyone has gathered by ', gatheredTail: '. We made time for one another.\nCeleste: Our ',
      shapes: ' shapes belong to all of us. You left the ', open: ' open in our room, so the picture never has to be the whole story.\nDez: We framed ',
      plan: '. Our plan was: ', looked: '. We brought the way we looked, not just the things we saw. ',
      beatsNone: 'Listening without marked beats is part of that welcome.', beatsSome: 'Our rhythm stays pictured; no sound is required.',
      thanh: '\nThanh: Our ', and: ' and ', pause: ' make room for a neighbor to pause and be heard.\nBea: This ',
      never: ' invitation was never a finish line. You brought us together around ', tail: '. Leave a place open for the next person.',
    },
    finale_text: {
      answer0: 'We can make another shape without painting over these.',
      answer1: 'There is room for another story after the last picture.',
      answer2: 'There is a place for someone we have not met yet.',
      response: '\nYour response: ',
      gatheredDone: ' This gathering is already complete for this visit. Back to choices returns to its ending options.',
      gatheredOpen: ' Choose Keep welcome open to finish this gathering. Reading or leaving does not finish it.',
      you: '\nYou: ',
      menu: '\nBea: Then this is a neighborhood. We keep the welcome open.\nReturn home begins a captioned journey closing our imagined future. Explore commons keeps this place open. Memories revisits only our copied work and this gathering.',
      memories: 'Memories of this visit | ',
      recapArt: "Celeste's six original shapes keep their ", recapArtMid: ' palette. The room\'s open place was ',
      recapFilm: "Dez's three pictures remain in order: ",
      recapSeats: "Thanh's copied seats: ", recapSeatsMid: '. Listening Hour: ',
      returnHome: 'Return home | Still panel ', of3: ' of 3\n',
      return0: 'Bea folds our ', return0Mid: ' paper after the gathering by ',
      return0Tail: '. Celeste, Dez and Thanh leave an open place aboard the imagined neighborhood. We are taking the welcome home, not packing away that new home.',
      return1: 'The imagined view of Earth becomes the colors on our paper. Celeste: Our originals are waiting on the block. Dez: The last picture can also be a doorway. Thanh: We know how to make a place for someone now. The same copies stay with this visit\'s memories.',
      return2: 'Today is on the other side of this open invitation. Bea: The future we imagined belongs beside the work we can do here. Choose Home now to finish the return and see your actual block again. Your street position, camera and earlier work are waiting exactly where you left them.',
      returnTail: '\nPrevious reviews these still panels; Skip reaches this same final invitation. Only Home now completes the return.',
      speculative: '\nSpeculative future, shared imagination. No personal story or meeting notes are shown. ',
      beatsNone: 'Listening only: no marked beats.', beatsSome: 'The copied rhythm stays silent.',
      tail: ' Recognition, gathering and memories last this visit only. Reload, successful load/import or moving a room copy clears them; failed browser import preserves them. Your completed film keeps access, but room and departure are prepared again. Pause/Escape stops this chapter without finishing a gathering or return.',
    },
    return_home: { tail: ' Watch your film, then open Revisit finale on the helper bench. Reload starts a fresh visit; your original work is kept.' },
    refresh: {
      heading: 'Tenderloin to the Stars | ', credit: '\nSpeculative future chapter | Copies | This visit only',
      walk: 'Walk the commons', gathered: 'An open place', menu: 'The welcome stays open', return: 'A way home', recap: 'Memories of this visit',
      intro: 'You are in the commons of a fictional orbital neighborhood. The yellow traveler is you; Thanh wears gold, Celeste rose, Dez purple with headphones, and Bea has her rollator. Art, Film and Seats are places you can walk to in any order. Choose a walking button or a marked floor destination. When you arrive, Invite Thanh is a separate choice.\n',
      another: '\nWalk to another view whenever you like. The yellow traveler is you; the originals remain at home.',
      invitation: "\nBea's copied invitation: ", copies: '. The original six shapes, three film pictures, seats and Listening Hour format travel as copies. ',
      beatsNone: 'Listening only: no marked beats.', beatsSome: 'The original rhythm is pictured silently.',
      tail: " No personal story or meeting notes are shown.\nStop, reading, Back and Pause stop local movement. Back reviews the departure; Pause/Escape returns to today's block while this fictional chapter waits for this visit. That is a pause, not completion of the authored return-home journey. Revisit through your film and room. Moving a room copy starts this chapter fresh. Reload or successful load/import clears this visit's walking and shared view; your completed film keeps the invitation, and you arrange and prepare again. No automatic reconstruction. Gather here brings everyone to your shared view; finishing that gathering offers memories, continued exploration and an authored return. Recognition stays this visit only. The street camera, Music and Sounds remain yours.",
      still: 'Your neighbors are still gathered here. Gather here returns to your unfinished response when you share their view.\n',
      walkArt: 'Walk to Art', walkFilm: 'Walk to Film', walkSeats: 'Walk to Seats', invite: 'Invite Thanh', stop: 'Stop', back: 'Back to departure', pause: 'Pause chapter',
      backChoices: 'Back to choices', keepOpen: 'Keep welcome open', backCommons: 'Back to commons',
      returnHome: 'Return home', explore: 'Explore commons', memories: 'Memories', gathering: 'Gathering',
      previous: 'Previous', next: 'Next', home: 'Home now', skip: 'Skip',
      artMemory: 'Art memory', filmMemory: 'Film memory', seatsMemory: 'Seats memory',
      finale: 'Finale choices', gather: 'Gather here', here: '. You are here.',
    },
    _process: {
      reached: 'You reached ', reachedTail: '. Invite Thanh to share this view, or walk somewhere else.',
      joined: 'Thanh has joined you. This shared view stays this visit; you can choose another place together.',
    },
  },
  'mural_workshop.gd': {
    setup: { paint: 'Paint Scenes' },
    open_stories: {
      message: 'Choose any two of five illustrated scenes, then the left or right half. Music & Garden shows more scenes. Lifting keeps the original three marks.',
      announce: 'Mural Stories. Food and art page 1 of 2. Music & Garden shows two more scenes. Choose any two scenes, then a half of the paper. Escape returns to Mural Workshop.',
    },
    close_stories: { back: 'Back to Mural Workshop. ' },
  },
  'mural_stories.gd': {
    setup: { attribution: 'Original fictional community art | City: DataSF/PDDL | Streets: OSM/ODbL', tooltip: '. Choose a half of the paper to paint or move this scene.', lift: 'Lift %s scene', back: 'Back to\nMural' },
    select_scene: { brush: ' is on your brush. Touch the left or right half to paint; a second placement moves it.' },
    change_page: {
      choose: 'Choose any two of five scenes. ',
      music: 'Making Music is a silent illustration; Growing Together pictures a shared planter.',
      food: 'Food and art scenes. Music and gardening are on the other page.',
    },
    present: {
      title: 'Mural Stories | Marks %d/3', celeste: ' Celeste: ',
      street: ' Story scenes sit under the original marks on the street board. Your earlier keepsake stays as it was.',
      music: ' Making Music is a silent illustration; Music controls the soundtrack separately.',
      pageMusic: 'Music &\nGarden', pageFood: 'Food &\nArt',
      pageMusicName: 'Show music and gardening scenes, page 2 of 2', pageFoodName: 'Show food and art scenes, page 1 of 2',
      target: '%s half: %s. Paint %s here.', open: 'open paper',
      paletteLabel: 'Palette:\n', musicLabel: 'Music:\n', on: 'On', off: 'Off',
    },
  },
};

// Godot constants the ending reads, deep-equal to their declarations (main.gd ones are typed).
export const GODOT_CONSTS = {
  'hosted_afternoon.gd': { IDS: ['stories', 'beats', 'art', 'pause'], OWNERS: ['Bea', 'Dez', 'Celeste', 'Thanh'], POSITIONS: ['first', 'second', 'third', 'fourth'] },
  'programme_gathering.gd': {
    OPENINGS: { stories: 'Bea: I unfold our invitation again. There is room to pass, and room to listen.', beats: 'Dez: We can begin by noticing the spaces in our rhythm.', art: "Celeste: I'll set our original six shapes where everyone can see them.", pause: "Thanh: Let's begin with somewhere to sit, without a task to finish." },
    HANDOFFS: {
      'stories>beats': ['Bea offers Dez the last turn; he answers with the spaces in our rhythm.', 'Bea lets the last words settle. Dez joins after the held moment.'],
      'stories>art': ['Bea invites Celeste to answer the circle with its six shapes.', 'Celeste waits while Bea folds the paper, then sets out our panel.'],
      'stories>pause': ['Bea asks Thanh to carry the welcome over to the seats.', "Thanh leaves a quiet opening after Bea's circle; nobody has to fill it."],
      'beats>art': ['Dez hands the turn to Celeste: six shapes can answer eight slots.', 'Dez leaves his last slot open. Celeste lets our colors arrive quietly.'],
      'beats>pause': ['Dez invites Thanh to make the spaces in our rhythm somewhere to sit.', 'Dez lowers his hands. Thanh holds the quiet without calling anyone forward.'],
      'art>stories': ['Celeste offers Bea a turn beside the panel; the invitation stays open.', 'Celeste steps back from the colors. Bea opens the paper in the space left.'],
      'art>beats': ['Celeste invites Dez to answer our shapes with his eight-slot pattern.', 'Celeste leaves the panel standing. Dez takes a moment before joining.'],
      'art>pause': ['Celeste asks Thanh to bring the welcome from the panel to the seats.', 'Celeste leaves the shapes to look at. Thanh makes room for an unhurried pause.'],
      'pause>stories': ['Thanh invites Bea from the quiet seats; listening has already begun.', 'Thanh keeps the open seat free. Bea unfolds the invitation without a summons.'],
      'pause>beats': ['Thanh offers Dez the next turn, with a place for anyone who only listens.', 'Thanh holds the quiet a little longer. Dez joins without filling every space.'],
      'pause>art': ['Thanh invites Celeste to bring the six shapes into our shared view.', 'Thanh leaves room to come and go. Celeste sets out our panel without a call.'],
    },
  },
  'helper_bench.gd': { FORMS: ['Low display', 'Upright display'] },
  'habitat_room.gd': {
    ITEMS: ['art', 'film', 'seats'], TITLES: ['Art', 'Film', 'Seats'], PLACES: ['entry', 'window', 'wall', 'side'], NAMES: ['Entry', 'Window', 'Far wall', 'Side nook'],
    SPOTS: [[42, 258], [422, 30], [42, 30], [422, 258]], OWNERS: ['Celeste', 'Dez', 'Thanh'], RELATIONS: ['Across', 'Along', 'Corner'],
  },
  'orbital_commons.gd': {
    DESTINATIONS: [[154, 310], [562, 330], [360, 390]], DISPLAY_RECTS: [[36, 106, 214, 143], [526, 55, 130, 218], [280, 103, 180, 120]],
    JUNCTION: [360, 350], ENTRY: [360, 438],
    GATHERED: [[[100, 410], [260, 365], [300, 426]], [[450, 410], [638, 416], [500, 315]], [[256, 414], [360, 302], [478, 420]]],
  },
  'bea_invitation.gd': {
    TITLES: { memory: 'A small moment you want to keep', future: 'Something you hope to make together' },
    EXAMPLES: {
      memory: "I once found a folded note in an old coat: a friend had written, 'There is a place for you here.' The coat wore out; I kept the note. A tiny thing can hold a whole afternoon.",
      future: 'I would like to make a string of paper flags with whoever feels like joining. Every flag could be different. We could leave a few blank for people who come later. It would still belong together.',
    },
    PAPER_COLORS: { memory: ['29525e', 'fff5dd', 'f5e7cb'], future: ['f5e7cb', '6a9a8c', 'f5e7cb'] },
  },
  'quiet_seats.gd': { TITLES: { arc: 'An open arc of seats', pairs: 'A pair and an open seat' } },
  'mural_stories.gd': {
    IDS: ['cooking', 'sharing', 'painting', 'music', 'garden'], SLOTS: ['left', 'right'],
    NAMES: { cooking: 'Cooking Together', sharing: 'Sharing a Bowl', painting: 'Making Street Art', music: 'Making Music', garden: 'Growing Together' },
    LABELS: { cooking: 'Cooking\nTogether', sharing: 'Sharing\na Bowl', painting: 'Making\nStreet Art', music: 'Making\nMusic', garden: 'Growing\nTogether' },
    PAGES: [['cooking', 'sharing', 'painting'], ['music', 'garden']],
  },
  'mural_signature.gd': { CREDIT: "Celeste's border: generic brass, Dez's hand drum, Thanh's tea, neighbors' heart. Original fictional art.", IDS: ['brass', 'drum', 'tea', 'heart'] },
  'main.gd': {
    MURAL_PALETTES: ['garden', 'sunset', 'ocean'],
    PROGRAMME_TITLES: { stories: 'Story circle', beats: 'Rhythm workshop', art: 'Shared art panel', pause: 'Quiet interval' },
    KEEPSAKE_PALETTE_HEX: { garden: ['#c37e71', '#276a5a', '#d6a449'], sunset: ['#cb7752', '#975a7c', '#dfb75f'], ocean: ['#508a9b', '#28665f', '#d3ab77'] },
    CIVIC_TOPIC_LABELS: { repairs: 'Repairs and staying put', access: 'Room to come and go' },
    CIVIC_TOPIC_REQUESTS: {
      repairs: 'We want homes cared for and neighbors able to stay. We ask for a conversation about repairs without displacement.',
      access: 'We want shared spaces that welcome neighbors while keeping entrances and the through-route clear.',
    },
    CIVIC_FORMAT_LABELS: { circle: 'Small listening circle', dropin: 'Drop-in notice table' },
    CIVIC_NOTE_LABELS: { themes: 'Keep anonymous themes', none: 'Keep no meeting notes' },
    FILM_SHOT_LABELS: { seat: 'An empty seat', paint: 'A shared motif', welcome: 'Room for one more' },
    FILM_SHOT_QUIET_CAPTIONS: { seat: 'A chair waits. There is room for someone new.', paint: 'A neighbor’s shape becomes part of something shared.', welcome: 'A place stays open. Joining in is an invitation.' },
    FILM_SHOT_LATER_CAPTIONS: { seat: '“May I sit here?” “We kept a place open.”', paint: '“Your shape belongs beside mine.”', welcome: '“Stay for a moment, or come back another day.”' },
    FILM_FRAMING_LABELS: { close: 'Objects in close-up', wide: 'Table and volunteer hands' },
    FILM_PLAN_LABELS: { quiet: 'A quiet prop take', later: 'Wait for the conversation' },
  },
};

// Godot literal -> fork literal. 2D has no save import or F-keys; everything else is Godot's own words.
export const ENDING_WEB_OVERRIDES = {
  "The Listening Hour is complete. Its remembered voices and Dez's offer remain in Listening Hour (F5).": "The Listening Hour is complete. Its remembered voices and Dez's offer remain in the Listening Hour.",
  '. Reload or successful import clears this visit, not the original afternoon.': '. Reload clears this visit, not the original afternoon.',
  '\nInvite joins turns; Make room holds an opening. Back edits the pinboard without changing this copy. Keep exploring retains it under Posted. Reload or successful import clears this visit; the saved afternoon keeps the invitation.': '\nInvite joins turns; Make room holds an opening. Back edits the pinboard without changing this copy. Keep exploring retains it under Posted. Reload clears this visit; the saved afternoon keeps the invitation.',
  'Back to the block. Your helper bench stays this visit. Watch your film to return; reload or a successful import clears the bench, not your invitation.': 'Back to the block. Your helper bench stays this visit. Watch your film to return; reload clears the bench, not your invitation.',
  "\nCopied order: %s. %s; %s. These are the film's original illustrations, separate from Celeste's hosted tile panel.\nThis is speculative fiction, not a present-day robot or launch claim. Assembly and display last this visit only. Reload or a successful import keeps your earned invitation from the completed film, and starts this bench fresh. Music, saved work and the street camera stay yours.": "\nCopied order: %s. %s; %s. These are the film's original illustrations, separate from Celeste's hosted tile panel.\nThis is speculative fiction, not a present-day robot or launch claim. Assembly and display last this visit only. Reload keeps your earned invitation from the completed film, and starts this bench fresh. Music, saved work and the street camera stay yours.",
  '. No personal story or meeting notes are shown.\nThis is speculative fiction, not a certified access plan. All reveal panels are still and captioned; Next panel and Skip reveal reach the same final panel. Back to room keeps your arrangement. Moving a copy removes these links and readiness; selection alone does not. Keep/Escape returns to the block and retains this visit only. Reload or successful load/import starts fresh; your completed film keeps the invitation. Music and the street camera stay yours.': '. No personal story or meeting notes are shown.\nThis is speculative fiction, not a certified access plan. All reveal panels are still and captioned; Next panel and Skip reveal reach the same final panel. Back to room keeps your arrangement. Moving a copy removes these links and readiness; selection alone does not. Keep/Escape returns to the block and retains this visit only. Reload starts fresh; your completed film keeps the invitation. Music and the street camera stay yours.',
  'Your room arrangement, departure preparation and local walking stay this visit, with movement stopped. Watch your film, then open the helper bench to revisit. Reload or successful import starts a fresh arrangement; your film keeps the invitation.': 'Your room arrangement, departure preparation and local walking stay this visit, with movement stopped. Watch your film, then open the helper bench to revisit. Reload starts a fresh arrangement; your film keeps the invitation.',
  '\nThis is a speculative room model, not a walkable habitat or certified access plan. Copies travel in our imagination; originals, borrowed things and home stay on the block. Welcome the room, then Prepare together to build the open-place frame and depart in a speculative future chapter. The final departure panel invites you to walk the orbital commons. Sharing a view in the commons offers a separate gathering and authored return. Show room returns from a detail; Escape or Keep returns to the block from either view. This arrangement lasts this visit only; reload or successful load/import starts it fresh. Your completed film keeps this invitation. Quiet, saved work and the street camera stay yours.': '\nThis is a speculative room model, not a walkable habitat or certified access plan. Copies travel in our imagination; originals, borrowed things and home stay on the block. Welcome the room, then Prepare together to build the open-place frame and depart in a speculative future chapter. The final departure panel invites you to walk the orbital commons. Sharing a view in the commons offers a separate gathering and authored return. Show room returns from a detail; Escape or Keep returns to the block from either view. This arrangement lasts this visit only; reload starts it fresh. Your completed film keeps this invitation. Quiet, saved work and the street camera stay yours.',
  ' Recognition, gathering and memories last this visit only. Reload, successful load/import or moving a room copy clears them; failed browser import preserves them. Your completed film keeps access, but room and departure are prepared again. Pause/Escape stops this chapter without finishing a gathering or return.': ' Recognition, gathering and memories last this visit only. Reload or moving a room copy clears them. Your completed film keeps access, but room and departure are prepared again. Pause/Escape stops this chapter without finishing a gathering or return.',
  " No personal story or meeting notes are shown.\nStop, reading, Back and Pause stop local movement. Back reviews the departure; Pause/Escape returns to today's block while this fictional chapter waits for this visit. That is a pause, not completion of the authored return-home journey. Revisit through your film and room. Moving a room copy starts this chapter fresh. Reload or successful load/import clears this visit's walking and shared view; your completed film keeps the invitation, and you arrange and prepare again. No automatic reconstruction. Gather here brings everyone to your shared view; finishing that gathering offers memories, continued exploration and an authored return. Recognition stays this visit only. The street camera, Music and Sounds remain yours.": " No personal story or meeting notes are shown.\nStop, reading, Back and Pause stop local movement. Back reviews the departure; Pause/Escape returns to today's block while this fictional chapter waits for this visit. That is a pause, not completion of the authored return-home journey. Revisit through your film and room. Moving a room copy starts this chapter fresh. Reload clears this visit's walking and shared view; your completed film keeps the invitation, and you arrange and prepare again. No automatic reconstruction. Gather here brings everyone to your shared view; finishing that gathering offers memories, continued exploration and an authored return. Recognition stays this visit only. The street camera, Music and Sounds remain yours.",
  // The fork's receipt is its own save status line; Godot's names Godot storage.
  'Saved to Godot storage.': 'Saved in this browser.',
};
export const web = text => Object.hasOwn(ENDING_WEB_OVERRIDES, text) ? ENDING_WEB_OVERRIDES[text] : text;
// Godot's % formatting for %s, %d and %f, the same as story.js fmt plus %f's six decimals.
export function gdf(template, ...args) {
  let i = 0;
  return template.replace(/%([sdf%])/g, (_, kind) => kind === '%' ? '%' : kind === 'd' ? String(Math.trunc(Number(args[i++]))) : kind === 'f' ? Number(args[i++]).toFixed(6) : String(args[i++]));
}
export const capitalize = text => String(text).split(/[\s_]+/).filter(Boolean).map(word => word[0].toUpperCase() + word.slice(1).toLowerCase()).join(' ');
// Fork-only text: what 2D says where Godot has no matching moment.
export const FORK_TEXT = {
  copiesChanged: 'The shared save changed, so this visit\'s ending started fresh. Your saved film, gathering and Listening Hour are kept.',
  restart: 'This clears the save this browser shares with the 3D edition, so it also resets the 3D edition: the neighbors you met, the gathering, mural, mural scenes, chapters and history discoveries, and the neighborhood surprises found only in 3D.',
};

const G = GODOT;
export const C = GODOT_CONSTS;
export { G };
