import test from 'node:test';
import assert from 'node:assert/strict';
import { gdConst, gdFunc, gdStrings, gdLines, gdSource } from './gd-lex.mjs';
import { GODOT, GODOT_CONSTS, ENDING_WEB_OVERRIDES, web, gdf } from '../browser-next/ending/text.js';

// ---------- Drift: the Godot sources are read at test time ----------
const flat = (value, out = []) => { if (typeof value === 'string') out.push(value); else if (value && typeof value === 'object') for (const v of Object.values(value)) flat(v, out); return out; };
const forkText = new Set(flat(GODOT));

test('every ending string is one literal of its Godot function', () => {
  for (const [file, funcs] of Object.entries(GODOT)) for (const [name, strings] of Object.entries(funcs)) {
    const lits = new Set(gdStrings(gdFunc(file, name)));
    for (const [key, text] of Object.entries(strings)) assert.ok(lits.has(text), `${file} ${name}.${key} drifted: ${JSON.stringify(text)}`);
  }
});

// Code-only literals: dictionary keys, ids, state names and SVG fragments are not text.
const looksLikeCode = s => /^[<#M]|="|\bstroke\b|^[a-z_]+$|%s:%s|^\d/.test(s);
// Literals of shared functions that belong to views outside the ending (the studio's draft and posted
// pinboard, the Listening Hour's planning and meeting turns, the mural workshop's marks), or to Godot's
// web lifecycle bridge. 2D covers those views elsewhere; a new literal not listed here still fails.
const OUTSIDE_ENDING = new Set([
  'Posted future plan. ', '. No date or real event is announced.', 'Nothing posted yet. Return to Draft to add and arrange the four proposals.',
  'All four proposals have room. Post this draft when you are ready.', 'Draft differs from the posted plan.', 'Draft matches the posted plan.',
  'This is a future plan. Revisions do not rewrite the gathering already ', 'Posting copies the draft. Start Hosting copies that posted order; listening is welcome.',
  'Pinboard order: ', '. Original imagined paper, not a real event poster.', 'Posted future plan', 'Draft pinboard', 'Fictional future plan | City/PDDL | OSM/ODbL',
  'Start hosting', 'Post revision', 'Programme Studio: ', '\nCity / PDDL | Streets OpenStreetMap / ODbL',
  'Draft, posted future plan and running gathering stay separate. Z keeps the quick path.',
  'Back to the block. Listening is welcome; Q keeps the original quick path.', 'Listening Hour | ', "Neighbors' turns", '%s | %s | %s',
  'Bea: Choose what we talk about, how people can join, and what we keep. A disagreement can belong here too. Start planning to change the invitation. Q still offers the quick path.',
  'Choose one of each. These are fictional plans, not completed repairs or a real event. Changes are saved; Convene copies this invitation.',
  '\nSpeak, pass or just listen. No timer; Close the hour whenever you are ready.', 'No timer; Close the hour whenever you are ready.',
  'This hour is complete. You can revisit any turn; the copied invitation stays unchanged.', 'Start planning', 'Close the hour',
  'Fictional portable art | City: DataSF/PDDL | Streets: OSM/ODbL', "%s's %s. Choose this contribution, then a space.", 'Palette: Garden', 'Back to Celeste',
]);
test('every long Godot literal of a listed function is copied', () => {
  for (const [file, funcs] of Object.entries(GODOT)) for (const name of Object.keys(funcs)) {
    for (const lit of gdStrings(gdFunc(file, name))) {
      if (lit.length < 12 || !lit.includes(' ') || looksLikeCode(lit) || OUTSIDE_ENDING.has(lit) || lit.includes('window.__tenderloin')) continue;
      assert.ok(forkText.has(lit), `${file} ${name} has uncopied text: ${JSON.stringify(lit)}`);
    }
  }
});

test('Godot constants match', () => {
  for (const [file, consts] of Object.entries(GODOT_CONSTS)) for (const [name, value] of Object.entries(consts)) {
    assert.deepEqual(gdConst(file, name), value, `${file} ${name}`);
  }
});

test('overrides replace real Godot literals and leave no 3D-only names', () => {
  const all = new Set(Object.keys(GODOT).flatMap(file => gdStrings(gdSource(file))));
  for (const [from, to] of Object.entries(ENDING_WEB_OVERRIDES)) {
    assert.ok(all.has(from), `override source is not Godot text: ${from}`);
    assert.ok(forkText.has(from), `override source is not copied: ${from}`);
    assert.notEqual(from, to);
  }
  for (const text of forkText) assert.doesNotMatch(web(text), /\(F\d+\)|\bimport\b|Godot storage/, `fork text still names a 3D-only control: ${text}`);
});

test('gdf follows Godot % formatting', () => {
  assert.equal(gdf('%s was %s.', 'A', 'B'), 'A was B.');
  assert.equal(gdf('%d of 3', 2.7), '2 of 3');
  assert.equal(gdf('x="%f"', 0.46), 'x="0.460000"');
});

// ---------- Art drift: every SVG builder's literals, in source order ----------
import { GODOT_ART, beaInvitationSVG, pinboardSVG, moduleSVG, vignette, muralScenesSVG, signatureSVG, sceneThumbnailSVG, svgBody, gatherBoardSVG, KEEPSAKE_PALETTE_HEX } from '../browser-next/ending/art.js';
test('art literals equal the Godot SVG builders', () => {
  for (const [file, funcs] of Object.entries(GODOT_ART)) for (const [name, list] of Object.entries(funcs)) assert.deepEqual(list, gdStrings(gdFunc(file, name)), `${file} ${name}`);
});

// ---------- Rule pins: the Godot lines each port follows ----------
function inOrder(lines, expected, label) {
  let at = -1;
  for (const want of expected) { const i = lines.findIndex((line, j) => j > at && line === want); assert.ok(i > at, `${label} moved or changed: ${want}`); at = i; }
}
test('the ported rules still read as they do in Godot', () => {
  inOrder(gdLines(gdFunc('hosted_afternoon.gd', 'invitation_available')), ['return game.is_hosting_done() and game.is_civic_available() and game.civic_phase in ["idle","planning","meeting"]'], 'invitation_available');
  inOrder(gdLines(gdFunc('orbital_commons.gd', 'can_gather')), ['return phase=="walk" and reached>=0 and shared==reached and not moving() and sharing<0'], 'can_gather');
  inOrder(gdLines(gdFunc('habitat_room.gd', 'facing')), ['var delta: Vector2=SPOTS[place_of(ITEMS[index])]-SPOTS[spare_place()]', 'return 0 if delta.y==0 else (1 if delta.x==0 else 2)'], 'facing');
  inOrder(gdLines(gdFunc('orbital_commons.gd', 'route')), ['if from.distance_to(to)<1: return result', 'result.append(to); return result', 'if from.distance_to(JUNCTION)>1: result.append(JUNCTION)', 'if to.distance_to(JUNCTION)>1: result.append(to)'], 'route');
  inOrder(gdLines(gdFunc('orbital_commons.gd', '_process')), ['var distance := minf(delta,0.05)*135.0', 'thanh=thanh.move_toward(thanh_path[0],distance*0.8)'], '_process');
  inOrder(gdLines(gdFunc('mural_stories.gd', 'clean')), ['if not raw is Dictionary: return out', 'for slot in SLOTS:', 'var id: Variant = raw.get(slot, "")', 'if id is String and id in IDS and not id in out.values(): out[slot] = id'], 'clean');
  inOrder(gdLines(gdFunc('main.gd', 'edit_mural_scene')), ['if mural_scenes[old_slot] == id: mural_scenes.erase(old_slot)', 'if id.is_empty(): mural_scenes.erase(slot)', 'if candidate_bytes > SAVE_BUDGET_MAX_BYTES and candidate_bytes > current_bytes:'], 'edit_mural_scene');
  inOrder(gdLines(gdFunc('main.gd', 'build_save_envelope')), ['if not mural_scenes.is_empty(): envelope["mural_scenes"] = mural_scenes.duplicate()'], 'build_save_envelope');
  inOrder(gdLines(gdFunc('habitat_room.gd', 'carry_or_welcome')), ['if mode!="room": departure_action(); return', 'if complete and not can_carry(): prepare_together(); return', 'elif assigned.size()==3 and not complete: complete=true; inspecting=false'], 'carry_or_welcome');
  inOrder(gdLines(gdFunc('programme_gathering.gd', 'handoff')), ['if visible and completed and review_step==gestures.size() and gesture==0:', 'if not visible or completed or gesture<0 or gesture>1 or gestures.size()>=3 or review_step!=gestures.size(): return'], 'handoff');
  inOrder(gdLines(gdFunc('helper_bench.gd', 'choose_form')), ['if not complete and (fitted[0] or fitted[1]): return'], 'choose_form');
});

// ---------- Per-step logic ----------
import { parseGodotSave, buildGodotSave, sceneAdmission, cleanMuralScenes, combineSaves, MURAL_SCENE_IDS, MURAL_SCENE_SLOTS } from '../browser-next/godot-save.js';
import { initialState, applyAction } from '../browser-next/core.js';
import { GODOT_WRITTEN, hostedEnvelope, civicDoneEnvelope, filmDoneEnvelope, godotEnvelope, raw } from './next-fixtures.mjs';
import * as H from '../browser-next/ending/hosted.js';
import * as GA from '../browser-next/ending/gather-again.js';
import * as SC from '../browser-next/ending/screening.js';
import * as B from '../browser-next/ending/bench.js';
import * as R from '../browser-next/ending/habitat.js';
import * as O from '../browser-next/ending/orbital.js';
import * as MU from '../browser-next/ending/mural.js';
import { freshVisit, syncVisit, fingerprint } from '../browser-next/ending/visit.js';
import { copied } from '../browser-next/ending/rules.js';

const load = text => { const r = parseGodotSave(text, { initialState }); assert.equal(r.status, 'loaded', r.reason); return r; };
const stateOf = env => load(raw(env)).state;
const full = () => load(GODOT_WRITTEN.fullRun).state;
const plan = { topic: 'repairs', format: 'circle', notes: 'themes' };
const withCivic = phase => stateOf(hostedEnvelope({ civic: { phase, draft: plan, result: ['meeting', 'done'].includes(phase) ? plan : null } }));

test('hosted: copied values follow Godot, including whole floats', () => {
  const s = stateOf(hostedEnvelope());
  assert.deepEqual(copied(s, 'beats'), { valid: true, value: 85 });
  const f = structuredClone(s); f.hosting.results[1].value = 85.000001;
  assert.deepEqual(copied(f, 'beats'), { valid: true, value: 85 });
  f.hosting.results[1].value = 85.5; assert.equal(copied(f, 'beats').valid, false);
  f.hosting.results[1].value = 256; assert.equal(copied(f, 'beats').valid, false);
  f.hosting.results[3].value = { palette: 'warm', tiles: [0, 1, 2, 2, 1, 3] }; assert.equal(copied(f, 'art').valid, false);
  assert.equal(copied(s, 'nothing').valid, false);
});
test('hosted: detail, replies and the offer for every civic phase', () => {
  const s = stateOf(hostedEnvelope());
  assert.equal(H.hostedDetail(s, 'stories'), 'Bea: "You made room for a small moment, and passing was welcome. No personal story was recorded."\nStory circle was first in the afternoon we hosted.\nCopied invitation: A small moment you want to keep.');
  assert.equal(H.hostedDetail(s, 'beats').split('\n')[2], 'Copied rhythm: 4 taps in eight slots, at 1, 3, 5, 7.');
  assert.equal(H.hostedDetail(s, 'art').split('\n')[2], 'Copied panel: Warm colors and six arranged shapes.');
  assert.equal(H.hostedDetail(s, 'pause').split('\n')[1], 'Quiet interval was third in the afternoon we hosted.');
  const f = full();
  assert.equal(H.hostedDetail(f, 'beats').split('\n')[0], 'Dez: "You gave listening a place without asking anyone to make a beat."');
  assert.equal(H.hostedDetail(f, 'pause').split('\n')[0], 'Thanh: "You kept a pair and an open seat, with the cushion marking a place. Coming and going were welcome."');
  assert.equal(H.hostedReplies(s).length, 4);
  for (const [phase, offer] of [['idle', 'I would like to make room'], ['planning', 'Your Listening Hour plan is still there'], ['meeting', 'The Listening Hour is open']]) {
    const st = withCivic(phase), v = H.hostedView(st, 'stories');
    assert.ok(H.invitationAvailable(st), phase);
    assert.match(H.invitation(st), new RegExp(`^Bea: "Our afternoon began with Story circle and ended with Shared art panel\\. ${offer}`));
    assert.deepEqual([v.primary.label, v.primary.disabled, v.back.label], ['Follow this invitation', false, 'Keep exploring']);
    assert.ok(v.text.includes('\nFollow takes you to the Listening Hour button'));
    assert.equal(H.hostedClose(st), "Back to the block. Bea's offer stays with your completed gathering.");
    assert.equal(H.followHosted(st, 'Chapter 4. ').announce, 'Chapter 4. ' + H.invitation(st) + ' Listening Hour is focused. Open that button when you are ready; your plan and conversation are unchanged.');
  }
  const done = withCivic('done'), v = H.hostedView(done, 'art');
  assert.equal(H.invitationAvailable(done), false);
  assert.deepEqual([v.primary.label, v.primary.disabled, v.back.label], ['Listening complete', true, 'Back']);
  assert.equal(H.followHosted(done), null);
  assert.equal(H.hostedClose(done), 'Back to the block. Your completed gathering and Listening Hour remain available.');
  assert.equal(H.invitation(done), "The Listening Hour is complete. Its remembered voices and Dez's offer remain in the Listening Hour.");
});
test('hosted: the picture per card and the card labels', () => {
  const s = stateOf(hostedEnvelope());
  assert.equal(H.hostedPicture(s, 'stories').svg, beaInvitationSVG('memory'));
  assert.match(H.hostedPicture(s, 'art').svg, /six-tile portable panel/);
  for (const id of ['beats', 'pause']) assert.equal(H.hostedPicture(s, id).svg, pinboardSVG(s.hosting.order));
  const v = H.hostedView(s, 'beats');
  assert.deepEqual(v.cards.map(c => c.label), ['1. Story circle\nBea', '2. Rhythm workshop\nDez', '4. Shared art panel\nCeleste', '3. Quiet interval\nThanh']);
  assert.equal(v.cards[1].name, '2. Rhythm workshop\nDez selected');
  assert.equal(v.heading, 'Programme Studio | Afternoon hosted');
  assert.ok(v.announce.startsWith('Programme Studio | Afternoon hosted. Dez: "You gave us 4 taps'));
});

test('gather again: refusals, posted order, handoffs, finish and a new visit', () => {
  const s = stateOf(hostedEnvelope());
  const unposted = structuredClone(s); unposted.programme.published = [];
  assert.equal(GA.prepare(GA.freshGather(), unposted).notice, 'Gathering not started: finish the first afternoon and post a valid four-part plan. Your previous visit stays intact.');
  const broken = structuredClone(s); broken.hosting.results[0].value = 'unknown';
  assert.equal(GA.prepare(GA.freshGather(), broken).notice, 'Gathering not started: an original copied contribution is unavailable. Your previous visit and saved afternoon stay intact.');
  const reposted = structuredClone(s); reposted.programme.published = ['art', 'stories', 'beats', 'pause'];
  let g = GA.openGather(GA.freshGather(), reposted);
  assert.deepEqual(g.gather.order, ['art', 'stories', 'beats', 'pause'], 'Gather again copies the posted order, not the hosted one');
  assert.match(GA.gatherDescription(g.gather, reposted), /A different order, with our original contributions\./);
  g = GA.openGather(GA.freshGather(), s);
  assert.equal(GA.gatherTitle(g.gather), 'Resume gathering');
  assert.equal(g.announce, 'Resume gathering. Bea: I unfold our invitation again. There is room to pass, and room to listen.\nBea: Our invitation, "A small moment you want to keep", is the original copy. No personal story or notes were recorded.');
  let v = GA.gatherView(g.gather, s);
  assert.deepEqual(v.buttons.filter(b => !b.hidden).map(b => b.label), ['Invite Dez', 'Make room', 'Back to Posted', 'Keep exploring']);
  g = GA.handoff(g.gather, 0, s);
  assert.equal(g.announce.split('\n')[0], 'Bea offers Dez the last turn; he answers with the spaces in our rhythm.');
  assert.equal(GA.handoff(g.gather, 5, s).gather, g.gather);
  g = GA.handoff(g.gather, 1, s);
  assert.equal(g.announce.split('\n')[0], 'Dez lowers his hands. Thanh holds the quiet without calling anyone forward.');
  g = GA.review(g.gather, -1); assert.equal(g.gather.step, 1);
  g = GA.review(g.gather, -5); assert.equal(g.gather.step, 0, 'Previous clamps at the opening');
  v = GA.gatherView(g.gather, s);
  assert.deepEqual(v.buttons.filter(b => !b.hidden).map(b => b.label), ['Next handoff', 'Back to Posted', 'Keep exploring'], 'no Previous at the opening');
  g = GA.advance(g.gather); g = GA.advance(g.gather); assert.equal(g.gather.step, 2);
  assert.equal(GA.gatherView(g.gather, s).buttons[0].label, 'Invite Celeste');
  g = GA.handoff(g.gather, 0, s);
  assert.equal(g.gather.gestures.length, 3);
  assert.equal(GA.handoff(g.gather, 0, s).gather, g.gather, 'a fourth gesture is refused');
  v = GA.gatherView(g.gather, s);
  assert.equal(v.buttons.find(b => b.id === 'gather-next').label, 'Finish gathering');
  g = GA.advance(g.gather);
  assert.equal(g.announce, 'Gathering complete this visit. ' + GA.closure());
  v = GA.gatherView(g.gather, s);
  const next = v.buttons.find(b => b.id === 'gather-next');
  assert.deepEqual([v.buttons[0].label, next.label, next.disabled], ['New visit', 'Complete', true]);
  assert.equal(GA.gatherTitle(g.gather), 'Revisit gathering');
  assert.equal(GA.gatherView(g.gather, reposted).buttons[0].label, 'New posted plan');
  const again = GA.handoff(g.gather, 0, s);
  assert.deepEqual([again.gather.gestures, again.gather.completed, again.announce.startsWith('New visit copied. ')], [[], false, true]);
  assert.equal(GA.backToPosted(g.gather), "Back to Posted. Revisit gathering keeps this visit's copied order and handoffs, even if you edit or repost.");
  assert.equal(GA.gatherClose(g.gather), 'Back to the block. Your gathering stays this visit. Open Programme Studio, Posted, then Revisit gathering. Reload clears this visit, not the original afternoon.');
});
test('gather again: the board marks each card and its handoff', () => {
  const s = stateOf(hostedEnvelope());
  let g = GA.openGather(GA.freshGather(), s).gather;
  g = GA.handoff(g, 0, s).gather; g = GA.handoff(g, 1, s).gather;
  const svg = GA.gatherView(g, s).board;
  assert.match(svg, /<title id="gather-title">Gather again \| A welcome in four parts<\/title>/);
  assert.match(svg, /<desc id="gather-desc">1\. Bea, Opening; 2\. Dez, Invite; 3\. Thanh, Make room; 4\. Celeste, Not yet<\/desc>/);
  assert.equal((svg.match(/stroke="#e2a04e"/g) || []).length, 1, 'one card is current');
  assert.equal((svg.match(/fill="#548b84" stroke="#29434a" stroke-width="3"/g) || []).length, 4, 'beats 85 marks four slots');
});

test('screening and the civic offer', () => {
  const s = stateOf(filmDoneEnvelope()), v = SC.screeningView(s, 1);
  assert.equal(v.title, 'The Open Seat | 2 / 3');
  assert.equal(v.text.split('\n')[0], '“May I sit here?” “We kept a place open.”');
  assert.equal(v.text.split('\n')[2], 'Table and volunteer hands | Wait for the conversation');
  assert.equal(v.frames[1].name, 'Frame 2 of 3: An empty seat, selected');
  assert.equal(v.announce, "The Open Seat. Frame 2 of 3. An empty seat. Original illustrated props and Celeste and Dez's volunteered fictional hands. “May I sit here?” “We kept a place open.” Silent illustrated sequence. Music is independent.");
  assert.equal(SC.screeningView(s, 9).frame, 0);
  const close = structuredClone(s); close.film.result.framing = 'close'; close.film.result.plan = 'quiet';
  assert.equal(SC.screeningView(close, 0).picture.alt, 'Room for one more. Original illustrated props, with no people pictured.');
  assert.equal(SC.screeningView(stateOf(civicDoneEnvelope()), 0), null);
  const c = stateOf(civicDoneEnvelope());
  assert.equal(SC.civicAcknowledgment(c), 'Dez: "You made a drop-in notice table for room to come and go. You left the notebook closed; our conversation did not become a record of each other. I would like to make The Open Seat with you, at your pace."');
  const offer = SC.civicOffer(c, 'A little film on the block');
  assert.ok(offer.text.endsWith("\nDez's standing invitation: make The Open Seat together. Follow takes you to 'A little film on the block'; choose that action when you are ready. Your film stays as you left it. Keep exploring retains this offer with your completed progress."));
  assert.deepEqual([offer.primary.label, offer.back.label], ['Follow this invitation', 'Keep exploring']);
  assert.equal(SC.civicOffer(s, 'x').primary.label, 'Revisit the film');
  const themes = structuredClone(c); themes.civic.result.notes = 'themes';
  assert.match(SC.civicAcknowledgment(themes), /You kept our shared request without names or testimony\./);
  assert.match(SC.civicOffer(themes, 'x').request, /^Authored shared request \(not sent; no names or testimony collected\): We want shared spaces/);
  assert.equal(SC.civicFollow(c, 'A little film on the block', ''), "Dez's invitation: A little film on the block. Choose this film action when you are ready; your film is unchanged.");
  assert.equal(SC.civicOffer(stateOf(hostedEnvelope()), 'x'), null);
});

test('bench: form lock, either order, assist, revisit label and frame positions', () => {
  const s = stateOf(filmDoneEnvelope());
  let b = B.freshBench();
  assert.equal(B.benchFocus(b), 'bench-form-0');
  b = B.chooseForm(b, 1).bench; assert.equal(b.selected, 1);
  assert.equal(B.finish(b).changed, false, 'Assist needs both supports');
  b = B.fitSupport(b, 1).bench;
  assert.equal(B.chooseForm(b, 0).changed, false, 'forms lock while partly fitted');
  assert.equal(B.benchFocus(b), 'bench-support-0');
  let view = B.benchView(b, s);
  assert.deepEqual(view.buttons.map(x => !!x.disabled), [true, true, false, true, true, false, true]);
  assert.match(view.text, /^Dez: Good, the upright display has one support\./);
  const fit = B.fitSupport(b, 0); b = fit.bench; assert.equal(fit.focus, 'bench-assist');
  assert.equal(B.fitSupport(b, 0).changed, false);
  b = B.finish(b).bench; assert.equal(b.complete, true);
  assert.equal(B.chooseForm(b, 0).bench.complete, true, 'after completion the other display keeps the bench complete');
  view = B.benchView(b, s, { habitatAvailable: true });
  assert.equal(view.buttons.find(x => x.id === 'bench-assist').label, 'Helper parked');
  assert.match(view.text, /^Dez: Your upright display holds all three pictures, ending on a shared motif\./);
  assert.ok(view.text.includes('Reload keeps your earned invitation'));
  assert.equal(B.benchView(b, s, { habitatAvailable: true, orbitCompleted: true, recognition: 'R.' }).buttons.at(-1).label, 'Revisit finale');
  assert.ok(B.benchView(b, s, { orbitCompleted: true, recognition: 'R.' }).text.startsWith('R.\n'));
  assert.equal(B.benchDescription({ selected: 0, fitted: [true, true], complete: true }), 'Low display jig: left support fitted; right support fitted. The helper has placed three copied film pictures and parked. The low illustration is foreshortened to show its tilt.');
  const low = B.helperBenchSVG({ selected: 0, fitted: [true, true], complete: true }, s.film.result);
  assert.ok(low.includes('<g transform="translate(160 222) scale(0.460000 0.320000)">'), 'the low stand stacks frames 80 apart');
  const up = B.helperBenchSVG({ selected: 1, fitted: [false, false], complete: false }, s.film.result);
  assert.ok(up.includes('<g transform="translate(325 20) scale(0.300000 0.300000)">') && up.includes('stroke-dasharray="10 8"'));
  assert.equal(B.benchClose(), 'Back to the block. Your helper bench stays this visit. Watch your film to return; reload clears the bench, not your invitation.');
});

const placeAll = (s, order = [[0, 0], [2, 1], [1, 2]]) => {
  let r = R.freshRoom();
  for (const [item, place] of order) { r = R.chooseItem(r, item).room; r = R.choosePlace(r, place).room; r = R.assist(r, s).room; }
  return r;
};
const departed = s => {
  let r = R.assist(placeAll(s), s).room; r = R.assist(r, s).room;
  for (const [item, rel] of [[0, 0], [2, 1], [1, 2]]) r = R.assist(R.choosePlace(R.chooseItem(r, item).room, rel).room, s).room;
  r = R.assist(R.assist(r, s).room, s).room;
  return R.choosePlace(r, 1).room;
};
test('habitat: availability, carry, move, welcome and the assist table', () => {
  assert.equal(R.habitatAvailable(stateOf(civicDoneEnvelope())), false);
  const s = stateOf(filmDoneEnvelope());
  assert.equal(R.habitatAvailable(s), true);
  let r = R.chooseItem(R.freshRoom(), 1).room;
  assert.equal(r.destination, 0);
  const carried = R.assist(r, s); r = carried.room;
  assert.deepEqual([r.assigned, carried.focus], [{ entry: 'film' }, 'room-item-2']);
  r = R.chooseItem(r, 1).room; assert.equal(r.destination, 0, 'a placed copy selects its own place');
  assert.equal(R.choosePlace(R.chooseItem(r, 0).room, 0).room.destination, 1, 'a place holding another copy is refused');
  // Every arrangement of three copies in four places: the assist label, its enabled state and facing().
  for (let spare = 0; spare < 4; spare++) {
    const places = [0, 1, 2, 3].filter(p => p !== spare);
    let room = placeAll(s, [[0, places[0]], [1, places[1]], [2, places[2]]]);
    for (let sel = 0; sel < 3; sel++) for (let dest = 0; dest < 4; dest++) {
      const a = R.roomView({ ...room, selected: sel, destination: dest }, s).buttons.find(x => x.id === 'room-assist');
      assert.deepEqual([a.label, a.disabled], [dest === spare ? 'Ask helper' : 'Welcome Thanh', false]);
    }
    room = R.assist({ ...room, destination: places[0] }, s).room;
    assert.equal(room.complete, true);
    const a = R.roomView({ ...room, destination: places[0] }, s).buttons.find(x => x.id === 'room-assist');
    assert.deepEqual([a.label, a.disabled], ['Prepare together', false]);
    for (let i = 0; i < 3; i++) { const p = R.SPOTS[places[i]], q = R.SPOTS[spare]; assert.equal(R.facing(room, i), p[1] === q[1] ? 0 : p[0] === q[0] ? 1 : 2, `facing ${i} with spare ${spare}`); }
  }
  r = placeAll(s);
  assert.equal(R.roomView(r, s).text.split('\n')[0], 'Thanh: All three copies have a place. You can rearrange them through the spare place, or deliberately welcome me to the room.');
  r = R.assist(r, s).room; assert.equal(r.complete, true);
  assert.equal(R.roomView(r, s).text.split('\n')[0], 'Thanh: "You left the side nook open. Our open arc has room to pause, and the middle stays clear."');
  const moved = R.assist(R.choosePlace(R.chooseItem(r, 0).room, 3).room, s);
  assert.deepEqual([moved.room.complete, moved.resetOrbit, moved.room.assigned.side], [false, true, 'art'], 'moving a copy un-welcomes the room and resets the departure');
  const detail = R.toggleDetail(R.chooseItem(r, 0).room).room;
  assert.ok(R.roomView(detail, s).picture.alt.startsWith('Detail of Art. '));
  assert.equal(R.habitatSVG(detail, R.habitatCopies(s), s), moduleSVG('art', R.habitatCopies(s)));
});
test('departure: links, wrong relations, ready, depart, panels and back to room', () => {
  const s = stateOf(filmDoneEnvelope());
  let r = R.assist(R.assist(placeAll(s), s).room, s).room;
  assert.equal(r.mode, 'links');
  assert.deepEqual([0, 1, 2].map(i => R.facing(r, i)), [0, 2, 1], 'Celeste Across, Dez Corner, Thanh Along');
  r = R.assist(R.choosePlace(R.chooseItem(r, 0).room, 2).room, s).room;
  assert.equal(r.notice, 'Celeste: My link faces our art by entry. Across is the same row; Along is the same column; Corner is diagonal. Try another side; nothing is lost.');
  assert.deepEqual(r.links, []);
  r = R.choosePlace(r, 0).room; assert.equal(r.notice, '');
  r = R.assist(r, s).room; assert.deepEqual([r.links, r.selected], [[0], 1]);
  assert.equal(R.chooseItem(r, 0).room.notice, 'Celeste: My link is already fitted. Choose another neighbor, or Ready together once all three fit.');
  assert.equal(R.roomView(R.chooseItem(r, 0).room, s).buttons.find(x => x.id === 'room-assist').disabled, true);
  r = R.assist(R.choosePlace(r, 2).room, s).room;
  r = R.assist(R.choosePlace(r, 1).room, s).room;
  assert.equal(r.links.length, 3);
  assert.match(R.roomView(r, s).text, /^Bea: All three links belong together\./);
  const keep = R.toggleDetail(r).room;
  assert.deepEqual([keep.mode, keep.links.length], ['room', 3], 'Back to room keeps the links');
  r = R.assist(r, s).room; assert.equal(r.ready, true);
  assert.match(R.roomView(r, s).text, /^Bea: "Our invitation is A small moment you want to keep\./);
  r = R.assist(r, s).room; assert.deepEqual([r.mode, r.panel], ['depart', 0]);
  const next = R.choosePlace(r, 0); assert.deepEqual([next.room.panel, next.focus], [1, 'room-place-0']);
  const skip = R.choosePlace(r, 1); assert.deepEqual([skip.room.panel, skip.focus], [2, 'room-detail']);
  const both = R.choosePlace(next.room, 0).room;
  assert.equal(R.roomView(both, s).text, R.roomView(skip.room, s).text, 'Next and Skip reach the same final panel');
  assert.equal(R.choosePlace(both, 0).room, both, 'panel 3 is the last');
  assert.equal(R.assist(both, s).openOrbit, true);
  assert.equal(R.roomView(both, s).picture.alt, 'Open-place frame. Room welcomed. Entry: Art; Window: Seats; Far wall: Film; Side nook: open place. The central passage stays clear.. Departure panel 3 of 3.');
  assert.ok(R.habitatSVG(both, R.habitatCopies(s), s).includes('<rect width="720" height="480" fill="#182c38"/>'));
  const invalid = structuredClone(s); invalid.hosting.results[0].value = 'gone';
  assert.equal(R.normalizeRoom(both, invalid).room.mode, 'room', 'an invalid invitation resets the departure');
});

const runOrbit = (o, reduced = false, dt = 16) => { const seen = []; let n = 0; while (O.moving(o) && n++ < 5000) { o = O.step(o, dt, reduced).orbit; seen.push([...o.player]); } return { o, seen }; };
test('orbital: route, speed, halt, gather, the finale machine and the return home', () => {
  assert.deepEqual(O.route(O.ENTRY, O.JUNCTION), [O.JUNCTION]);
  assert.deepEqual(O.route(O.ENTRY, O.DESTINATIONS[1]), [O.JUNCTION, O.DESTINATIONS[1]]);
  assert.deepEqual(O.route(O.ENTRY, [360, 400]), [[360, 400]], 'along one spoke the route is direct');
  assert.deepEqual(O.route(O.DESTINATIONS[1], [604, 340]), [O.JUNCTION, [604, 340]], 'a destination and its neighbour spot are on different spokes');
  assert.deepEqual(O.route(O.ENTRY, O.ENTRY), []);
  const s = stateOf(filmDoneEnvelope()), r = departed(s);
  assert.equal(O.openChapter(O.freshOrbit(), { ...r, panel: 1 }, s).opened, false);
  let o = O.openChapter(O.freshOrbit(), r, s).orbit;
  assert.deepEqual([o.started, o.visible, o.invitationTitle], [true, true, 'A small moment you want to keep']);
  o = O.orbitAction(o, 1).orbit;
  assert.equal(o.notice, 'Walking to Film. Stop or focus the reading panel to pause. Arrival does not invite anyone.');
  const one = O.step(o, 1000).orbit;
  assert.ok(Math.abs(Math.hypot(one.player[0] - O.ENTRY[0], one.player[1] - O.ENTRY[1]) - 135 * 0.05) < 1e-9, 'a frame is capped at 50 ms of 135 px/s');
  const halted = O.halt(one);
  assert.deepEqual([halted.halted, halted.orbit.notice, O.moving(halted.orbit)], [true, 'Stopped here. Choose a place to walk again; nobody moves while you read.', false]);
  o = runOrbit(o).o;
  assert.deepEqual([o.reached, o.player], [1, [562, 330]]);
  assert.equal(o.notice, 'You reached Film. Invite Thanh to share this view, or walk somewhere else.');
  o = O.orbitAction(o, 3).orbit;
  const t1 = O.step(o, 50).orbit;
  assert.ok(Math.abs(Math.hypot(t1.thanh[0] - 432, t1.thanh[1] - 350) - 135 * 0.05 * 0.8) < 1e-9, 'Thanh walks at 0.8x');
  assert.equal(O.halt(t1).orbit.notice, 'Thanh paused on the path. Invite him again when you want to continue.');
  o = runOrbit(o).o;
  assert.deepEqual([o.shared, O.canGather(o), O.orbitButtons(o)[4].label], [1, true, 'Gather here']);
  const walking = runOrbit(O.orbitAction(o, 0).orbit);
  assert.equal(walking.o.reached, 0);
  o = O.orbitAction(o, 4).orbit; assert.deepEqual([o.phase, o.gathering], ['gathered', 1]);
  assert.match(O.orbitalView(o, r).text, /^A little later, everyone has gathered by Film\./);
  assert.deepEqual(O.orbitButtons(o).filter(b => !b.hidden).map(b => b.label), ['Keep welcome open', 'Back to commons', 'Back to departure', 'Pause chapter']);
  o = O.orbitAction(o, 0).orbit; assert.deepEqual([o.phase, o.completed], ['menu', true]);
  assert.equal(O.recognition(o), 'The orbital gathering is complete this visit. Your authored return is still a separate choice.');
  o = O.orbitAction(o, 2).orbit; assert.equal(o.phase, 'recap');
  o = O.orbitAction(o, 1).orbit;
  assert.match(O.orbitalView(o, r).text, /^Memories of this visit \| Film\nDez's three pictures remain in order: Room for one more, An empty seat, A shared motif\. Table and volunteer hands\./);
  o = O.orbitAction(o, 3).orbit; assert.equal(o.phase, 'menu');
  o = O.orbitAction(o, 0).orbit; assert.deepEqual([o.phase, o.returnPanel], ['return', 0]);
  assert.equal(O.orbitAction(o, 0).orbit.phase, 'menu', 'Previous on the first panel goes back to the choices');
  o = O.orbitAction(O.orbitAction(o, 1).orbit, 1).orbit; assert.equal(o.returnPanel, 2);
  assert.deepEqual(O.orbitButtons(o).filter(b => !b.hidden).map(b => b.label), ['Previous', 'Home now', 'Back to choices', 'Pause chapter']);
  assert.equal(O.orbitalSVG(o, r).includes('data-walker'), false, 'the return panels hide the walkers');
  const home = O.orbitAction(o, 1);
  assert.deepEqual([home.effect, home.orbit.returned, home.orbit.phase], ['home', true, 'menu']);
  assert.equal(home.announce, "You finished the imagined orbital afternoon and its return to today's block. This visit's memories and commons remain available. Watch your film, then open Revisit finale on the helper bench. Reload starts a fresh visit; your original work is kept.");
  assert.equal(O.returnHome({ ...o, completed: false }).orbit.returned, false, 'Home now needs the finished gathering');
  assert.equal(O.orbitAction(home.orbit, 6).effect, 'pause');
  assert.equal(O.orbitAction(home.orbit, 5).effect, 'departure');
  assert.equal((O.orbitalSVG(walking.o, r).match(/data-target=/g) || []).length, 3, 'the walk phase has three floor targets');
});
test('orbital: reduced motion hops through every waypoint without in-between positions', () => {
  const s = stateOf(filmDoneEnvelope());
  let o = { ...O.freshOrbit(), started: true, visible: true, copies: R.habitatCopies(s), invitationTitle: 'x', invitationColors: ['000000', 'ffffff', 'ffffff'] };
  o = O.walkTo(o, 0).orbit;
  const { o: done, seen } = runOrbit(o, true, 50);
  const distinct = seen.filter((p, i) => i === 0 || p[0] !== seen[i - 1][0] || p[1] !== seen[i - 1][1]);
  assert.deepEqual(distinct, [O.ENTRY, O.JUNCTION, O.DESTINATIONS[0]].slice(seen[0][0] === O.ENTRY[0] && seen[0][1] === O.ENTRY[1] ? 0 : 1), 'one hop per route vertex');
  assert.deepEqual(done.player, O.DESTINATIONS[0]);
  assert.equal(seen.length, 10, 'two hops of 250 ms at 50 ms frames');
});

test('mural scenes: clean, edit, move, lift and replies', () => {
  assert.deepEqual(MURAL_SCENE_IDS, GODOT_CONSTS['mural_stories.gd'].IDS);
  assert.deepEqual(MURAL_SCENE_SLOTS, GODOT_CONSTS['mural_stories.gd'].SLOTS);
  // godot/tests/study_test.gd 4216-4223.
  for (const malformed of [null, [], 'cooking', { left: 'unknown', right: 9 }, { left: 'cooking', right: 'cooking', third: 'painting' }]) assert.ok(Object.keys(cleanMuralScenes(malformed)).length <= 1);
  assert.deepEqual(cleanMuralScenes({ left: 'sharing', right: 'painting' }), { left: 'sharing', right: 'painting' });
  assert.deepEqual(cleanMuralScenes({ left: 'music', right: 'garden' }), { left: 'music', right: 'garden' });
  assert.deepEqual(cleanMuralScenes({ left: 'music', right: 'music' }), { left: 'music' });
  let out = MU.editScene({}, 'music', 'left');
  assert.deepEqual([out.scenes, out.message], [{ left: 'music' }, 'Making Music painted on the left.']);
  assert.deepEqual([MU.editScene(out.scenes, 'music', 'left').message, MU.editScene(out.scenes, 'music', 'left').changed], ['Making Music is already on the left.', false]);
  out = MU.editScene(out.scenes, 'music', 'right'); assert.deepEqual(out.scenes, { right: 'music' }, 'a scene moves, never repeats');
  out = MU.editScene(out.scenes, 'garden', 'left'); assert.deepEqual(Object.keys(out.scenes), ['left', 'right']);
  assert.equal(MU.editScene(out.scenes, '', 'left').message, 'Lifted the left scene.');
  assert.equal(MU.editScene({}, '', 'left').changed, false, 'lifting an empty slot is refused');
  assert.equal(MU.editScene({}, 'rocket', 'left').changed, false);
  assert.equal(MU.sceneReply({}), 'A meal, a painter, a guitarist or neighbors growing plants can tell another story here.');
  assert.equal(MU.sceneReply({ left: 'garden', right: 'music' }), 'Growing Together on the left, Making Music on the right. You made room for everyday creativity.');
  assert.equal(MU.neighborTail('dez', { right: 'music' }), ' That painted guitar leaves room for a quiet song, too.');
  assert.equal(MU.neighborTail('thanh', { right: 'music' }), '');
  const v = MU.storiesView(MU.freshStories(), { left: 'music' }, { palette: 'ocean', marks: 3 });
  assert.equal(v.title, 'Mural Stories | Marks 3/3');
  assert.equal(v.targets[0].name, 'Left half: Making Music. Paint Cooking Together here.');
  assert.deepEqual(v.lifts.map(l => l.disabled), [false, true]);
  assert.ok(v.text.endsWith(' Making Music is a silent illustration; Music controls the soundtrack separately.'));
  assert.equal(v.paper, muralScenesSVG({ left: 'music' }, KEEPSAKE_PALETTE_HEX.ocean));
  assert.equal(MU.changePage(MU.freshStories()).stories.selected, 'music');
  // mural_stories.gd setup() and present(): the footer's Palette (rapid) and two-line Music labels; set_mural_palette's line.
  assert.deepEqual(v.palette, { id: 'scene-palette', label: 'Palette:\nOcean', rapid: true });
  assert.equal(MU.storiesView(MU.freshStories(), {}, { palette: 'sunset', music: true }).palette.label, 'Palette:\nSunset');
  assert.deepEqual([v.music.id, v.music.label, MU.storiesView(MU.freshStories(), {}, { music: true }).music.label], ['ending-music', 'Music:\nOff', 'Music:\nOn']);
  assert.equal(MU.nextPalette('garden'), 'sunset'); assert.equal(MU.nextPalette('ocean'), 'garden'); assert.equal(MU.nextPalette('neon'), 'garden');
  assert.equal(MU.paletteAnnouncement('sunset', 2), 'Portable Mural Board palette set to Sunset (2/3 motifs).');
  for (const id of MURAL_SCENE_IDS) assert.doesNotMatch(vignette(id, KEEPSAKE_PALETTE_HEX.garden) + sceneThumbnailSVG(id, KEEPSAKE_PALETTE_HEX.garden), /undefined|%[sdf]/);
  assert.match(signatureSVG(KEEPSAKE_PALETTE_HEX.garden, true), /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="72" height="128" viewBox="0 0 72 128"><rect width="100%" height="100%"/);
  assert.equal(svgBody('<svg a="1"><g/></svg>'), '<g/>');
});
test('mural scenes in the shared save: Godot rules, budget admission, rebase and combine', () => {
  const loaded = load(GODOT_WRITTEN.fullRun);
  assert.deepEqual(loaded.state.muralScenes, { left: 'music', right: 'garden' });
  const lift = applyAction(loaded.state, { type: 'mural-scene', id: '', slot: 'left' });
  assert.deepEqual(lift.muralScenes, { right: 'garden' });
  assert.equal(applyAction(loaded.state, { type: 'mural-scene', id: 'music', slot: 'left' }), loaded.state, '"already" changes nothing, so nothing is written');
  const written = buildGodotSave(loaded.envelope, lift);
  assert.equal(written.ok, true, written.reason);
  assert.deepEqual(JSON.parse(written.raw).mural_scenes, { right: 'garden' });
  assert.deepEqual(load(written.raw).state.muralScenes, { right: 'garden' }, 'round trip');
  const empty = applyAction(lift, { type: 'mural-scene', id: '', slot: 'right' });
  assert.equal(Object.hasOwn(JSON.parse(buildGodotSave(written.envelope, empty).raw), 'mural_scenes'), false, 'an empty dict is omitted, as Godot writes it');
  const fresh = parseGodotSave(null, { initialState });
  assert.ok(buildGodotSave(fresh.envelope, applyAction(fresh.state, { type: 'mural-scene', id: 'cooking', slot: 'right' })).raw.includes('"mural_scenes":{"right":"cooking"}'));
  // A malformed stored value is replaced by Godot's cleaned one only when this tab edits the scenes.
  const odd = load(raw(godotEnvelope({ mural_scenes: { left: 'cooking', right: 'cooking', third: 'x' } })));
  assert.deepEqual(JSON.parse(buildGodotSave(odd.envelope, applyAction(odd.state, { type: 'mural-scene', id: 'garden', slot: 'right' })).raw).mural_scenes, { left: 'cooking', right: 'garden' });
  // Admission: growth past 4096 is refused; a shrinking edit of an oversized save is allowed.
  const over = load(raw(godotEnvelope({ optional: { pad: 'x'.repeat(4000) }, mural_scenes: { left: 'cooking' } })));
  assert.equal(sceneAdmission(over.envelope, over.state, applyAction(over.state, { type: 'mural-scene', id: 'painting', slot: 'right' })), false);
  assert.equal(sceneAdmission(over.envelope, over.state, applyAction(over.state, { type: 'mural-scene', id: '', slot: 'left' })), true);
  assert.equal(sceneAdmission(loaded.envelope, loaded.state, lift), true);
  assert.equal(MU.sceneRefusal(), 'Your existing save is full; this scene was not changed.');
  // Rebase reapplies the edit onto another tab's save; combining keeps this tab's lift.
  const otherTab = load(GODOT_WRITTEN.fullRunScenes);
  assert.deepEqual(applyAction(otherTab.state, { type: 'mural-scene', id: '', slot: 'left' }).muralScenes, { right: 'sharing' });
  const stale = load(raw({ ...JSON.parse(GODOT_WRITTEN.fullRun), mural_scenes: undefined, save_seq: 200 }));
  const combined = combineSaves(stale.envelope, lift, loaded.envelope);
  assert.equal(combined.ok, true, combined.reason);
  assert.deepEqual(JSON.parse(combined.raw).mural_scenes, { right: 'garden' }, "a lift since this tab's write base is not undone by the base's scenes");
  const untouched = combineSaves(otherTab.envelope, loaded.state, loaded.envelope);
  assert.deepEqual(JSON.parse(untouched.raw).mural_scenes, { left: 'cooking', right: 'sharing' }, 'scenes this tab left alone follow the stored save');
});

test('visit: one object, cleared only by an adopted change, never saved', () => {
  const s = stateOf(filmDoneEnvelope()), v = freshVisit(s);
  assert.deepEqual(Object.keys(v).sort(), ['bench', 'fingerprint', 'gather', 'hostedSelected', 'orbit', 'room', 'screenFrame', 'stories']);
  const busy = { ...v, bench: B.fitSupport(v.bench, 0).bench };
  assert.equal(syncVisit(busy, s).visit, busy);
  const reposted = structuredClone(s); reposted.programme.published = ['art', 'stories', 'beats', 'pause'];
  assert.equal(syncVisit(busy, reposted).visit.bench, busy.bench, "this tab's own edits keep the visit, as Godot keeps a gathering through a repost");
  const adopted = syncVisit(busy, reposted, { adopted: true });
  assert.deepEqual([adopted.reset, adopted.visit.bench], [true, B.freshBench()]);
  assert.equal(syncVisit(busy, s, { adopted: true }).reset, false, 'an adopted save with the same copies keeps the visit');
  assert.notEqual(fingerprint(s), fingerprint(reposted));
});

test('a whole ending run leaves the stored save byte-identical except mural_scenes edits', () => {
  const stored = GODOT_WRITTEN.fullRun, start = load(stored), s = start.state, before = JSON.stringify(s);
  let visit = freshVisit(s);
  for (const id of ['stories', 'beats', 'art', 'pause']) H.hostedView(s, id);
  let g = GA.openGather(visit.gather, s).gather;
  for (const gesture of [0, 1, 0]) g = GA.handoff(g, gesture, s).gather;
  visit = { ...visit, gather: GA.advance(g).gather, screenFrame: 2 };
  SC.screeningView(s, visit.screenFrame); SC.civicOffer(s, 'film');
  let b = visit.bench;
  for (const act of [x => B.fitSupport(x, 0), x => B.fitSupport(x, 1), B.finish]) b = act(b).bench;
  const r = departed(s);
  let o = O.openChapter(visit.orbit, r, s).orbit;
  o = runOrbit(O.orbitAction(o, 2).orbit).o; o = runOrbit(O.orbitAction(o, 3).orbit).o;
  for (const i of [4, 0, 0, 1, 1, 1]) o = O.orbitAction(o, i).orbit;
  assert.equal(o.returned, true);
  B.benchView(b, s, { habitatAvailable: true, orbitCompleted: o.completed, recognition: O.recognition(o) });
  assert.equal(JSON.stringify(s), before, 'no ending step changes the fork state, so nothing reaches the save');
  // The chain's one saved effect: Mural Stories edits, through the reducer and buildGodotSave.
  let state = s, env = start.envelope, written = stored;
  for (const [id, slot] of [['cooking', 'left'], ['sharing', 'right'], ['', 'left']]) {
    const next = applyAction(state, { type: 'mural-scene', id, slot });
    assert.ok(sceneAdmission(env, state, next));
    const out = buildGodotSave(env, next); assert.equal(out.ok, true, out.reason);
    state = next; env = out.envelope; written = out.raw;
  }
  const a = JSON.parse(stored), z = JSON.parse(written);
  assert.deepEqual(z.mural_scenes, { right: 'sharing' });
  assert.equal(z.save_seq, a.save_seq + 3);
  for (const e of [a, z]) { delete e.mural_scenes; delete e.save_seq; }
  assert.equal(JSON.stringify(z), JSON.stringify(a), 'everything else is byte-identical');
});
