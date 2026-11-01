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
  // hosted_afternoon.gd detail() and invitation(), the one port of them (ending/hosted.js; game.js's "What we shared" reads it).
  const D = GODOT['hosted_afternoon.gd'].detail, I = GODOT['hosted_afternoon.gd'].invitation, q = s => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
  inOrder(gdLines(gdFunc('hosted_afternoon.gd', 'detail')), [
    'var index := IDS.find(id)', 'var position: int=game.hosting_order.find(id)', `if index<0 or position<0 or position>=POSITIONS.size(): return ${q(D.none)}`,
    `var heading: String=${q(D.heading)}%[game.programme_title(id),POSITIONS[position]]`, 'var copy := copied(game,id)', `if not copy.valid: return heading+${q(D.unavailable)}`,
    `reply=${q(D.storiesMemory)} if value=="memory" else ${q(D.storiesFuture)}`,
    'for i in range(8):', 'if (int(value)&(1<<i))!=0: slots.append(str(i+1))',
    `result=${q(D.beatsNone)} if slots.is_empty() else ${q(D.beatsSome)}%[slots.size(),", ".join(slots)]`,
    `reply=${q(D.beatsNoneReply)} if slots.is_empty() else ${q(D.beatsSomeReply)}%slots.size()`,
    `result=${q(D.artResult)}%String(value.palette).capitalize()`, `reply=${q(D.artWarm)} if value.palette=="warm" else ${q(D.artCool)}`,
    `reply=${q(D.pauseArc)} if value=="arc" else ${q(D.pausePairs)}`,
    `return OWNERS[index]+': "'+reply+'"'+"\\n"+heading+"\\n"+result`,
  ], 'hosted_afternoon.gd detail');
  inOrder(gdLines(gdFunc('hosted_afternoon.gd', 'invitation')), [
    'if not game.is_hosting_done(): return ""', `if game.civic_phase=="done": return ${q(I.done)}`,
    `var opening: String=${q(I.opening)}%[game.programme_title(game.hosting_order[0]),game.programme_title(game.hosting_order[3])]`,
    `if game.civic_phase=="planning": offer=${q(I.planning)}`, `elif game.civic_phase=="meeting": offer=${q(I.meeting)}`, `return 'Bea: "'+opening+" "+offer+'"'`,
  ], 'hosted_afternoon.gd invitation');
  inOrder(gdLines(gdFunc('hosted_afternoon.gd', 'copied')), ['if id=="beats" and game.is_whole_json_number(raw) and int(roundf(float(raw)))>=0 and int(roundf(float(raw)))<=255:', 'if not game.is_whole_json_number(tile) or int(roundf(float(tile)))<0 or int(roundf(float(tile)))>2: return {"valid":false}'], 'hosted_afternoon.gd copied');
});

// ---------- Per-step logic ----------
import { parseGodotSave, buildGodotSave, sceneAdmission, cleanMuralScenes, combineSaves, MURAL_SCENE_IDS, MURAL_SCENE_SLOTS } from '../browser-next/godot-save.js';
import { initialState, applyAction } from '../browser-next/core.js';
import { GODOT_WRITTEN, PUBLISHED, HOSTED_RESULTS, openedEnvelope, hostedEnvelope, civicDoneEnvelope, filmDoneEnvelope, godotEnvelope, raw } from './next-fixtures.mjs';
import { currentActivity } from '../browser-next/hosting.js';
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
  // Godot's line with only its F5 key hint dropped, as every other key hint the fork drops.
  assert.equal(H.invitation(done), "The Listening Hour is complete. Its remembered voices and Dez's offer remain in Listening Hour.");
  assert.equal(web(GODOT['hosted_afternoon.gd'].invitation.done), GODOT['hosted_afternoon.gd'].invitation.done.replace(' (F5)', ''));
});
test('hosted: each detail in hosted order, unreadable copies, and no offer before the fourth is hosted', () => {
  const order = ['beats', 'pause', 'stories', 'art'], results = [{ id: 'beats', value: 85 }, { id: 'pause', value: 'pairs' }, { id: 'stories', value: 'memory' }, { id: 'art', value: { palette: 'cool', tiles: [0, 1, 2, 2, 1, 0] } }];
  const s = stateOf(hostedEnvelope({ programme: { order: [...order], published: [...order] }, hosting: { ...hostedEnvelope().hosting, order: [...order], results } }));
  assert.equal(H.hostedDetail(s, 'beats'), 'Dez: "You gave us 4 taps in eight slots. I kept the spaces between them too."\nRhythm workshop was first in the afternoon we hosted.\nCopied rhythm: 4 taps in eight slots, at 1, 3, 5, 7.');
  assert.equal(H.hostedDetail(s, 'pause'), 'Thanh: "You kept a pair and an open seat, with the cushion marking a place. Coming and going were welcome."\nQuiet interval was second in the afternoon we hosted.\nCopied seating: A pair and an open seat.');
  assert.equal(H.hostedDetail(s, 'stories'), 'Bea: "You made room for a small moment, and passing was welcome. No personal story was recorded."\nStory circle was third in the afternoon we hosted.\nCopied invitation: A small moment you want to keep.');
  assert.equal(H.hostedDetail(s, 'art'), 'Celeste: "Our six shapes stay in cool colors, just as we hung them."\nShared art panel was fourth in the afternoon we hosted.\nCopied panel: Cool colors and six arranged shapes.');
  assert.deepEqual(H.hostedReplies(s).map(d => d.split('\n')[0].split(':')[0]), ['Bea', 'Dez', 'Celeste', 'Thanh'], "replies() keeps Godot's segment order, not the hosted order");
  const quiet = structuredClone(s); quiet.hosting.results[0].value = 0;
  assert.deepEqual(H.hostedDetail(quiet, 'beats').split('\n').filter((_, i) => i !== 1), ['Dez: "You gave listening a place without asking anyone to make a beat."', 'Copied rhythm: listening only, with no marked beats.']);
  const broken = structuredClone(s); broken.hosting.results[0].value = 2.5; broken.hosting.results[3].value.tiles[5] = 9;
  assert.equal(H.hostedDetail(broken, 'beats'), 'Rhythm workshop was first in the afternoon we hosted.\nThe copied choice is unavailable. The saved gathering stays unchanged.');
  assert.equal(H.hostedDetail(broken, 'art').split('\n')[1], 'The copied choice is unavailable. The saved gathering stays unchanged.');
  const whole = structuredClone(s); whole.hosting.results[0].value = 85.000001;
  assert.equal(H.hostedDetail(whole, 'beats'), H.hostedDetail(s, 'beats'), 'a whole float reads as its integer, as Godot is_whole_json_number does');
  for (const nothing of [[s, 'nope'], [stateOf(openedEnvelope()), 'stories']]) assert.equal(H.hostedDetail(...nothing), 'No copied contribution is available. The saved gathering stays unchanged.');
  const midway = structuredClone(s); midway.hosting.results = midway.hosting.results.slice(0, 3);
  assert.deepEqual([H.invitation(midway), H.invitationAvailable(midway), H.postedGatherLine(midway)], ['', false, '']);
  assert.equal(H.invitation({ ...s, civic: { ...s.civic, phase: 'idle' } }), 'Bea: "Our afternoon began with Rhythm workshop and ended with Shared art panel. I would like to make room for a Listening Hour too, when you are ready."');
  // programme_studio.gd description(): once all four are hosted the posted view adds the Gather again line.
  assert.equal(H.postedGatherLine(s), GODOT['programme_studio.gd'].description.postedGather);
});
// The hosting dialog's own finished view (a review, Bea's offer and Follow) is unreachable: game.js hostingScreen returns through
// ending.open('hosted') when currentActivity() is null, and that is exactly when the ending's hosted view opens.
test("hosted: with no current activity the ending's hosted view always opens, so the hosting dialog never draws a finished view", () => {
  for (const order of [PUBLISHED, ['stories', 'beats', 'art', 'pause'], ['art', 'stories', 'pause', 'beats']]) for (let done = 0; done <= 4; done++) {
    const results = order.slice(0, done).map(id => HOSTED_RESULTS.find(r => r.id === id));
    const s = stateOf(hostedEnvelope({ programme: { order: [...order], published: [...order] }, hosting: { ...hostedEnvelope().hosting, order: [...order], results } }));
    assert.equal(s.hosting.results.length, done, `${order} ${done}: the save loads with ${done} hosted`);
    const ending = createEnding(endingHost(fakeDialog(), s));
    assert.deepEqual([currentActivity(s.hosting) === null, ending.open('hosted')], [done === 4, done === 4], `${order} after ${done}`);
  }
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

// ---------- The DOM side (ending/ui.js) on a stand-in dialog: a redraw that waits draws only the stage still on screen ----------
import { createEnding } from '../browser-next/ending/ui.js';
import { fakeDialog } from './next-fixtures.mjs';
function endingHost(dialog, state, over = {}) {
  return { ...dialog, show: dialog.show, close: () => dialog.close(), getState: () => state, status() {}, toast() {}, stopWalk() {}, reducedMotion: () => false, chapterText: () => '', act() {},
    sceneAdmission: () => true, saveReason: () => '', settle: { tap() {} }, music: { label: () => 'Music: Off', on: () => false, toggle: async () => {} }, filmButtonLabel: () => 'A little film on the block',
    openDraft() {}, openPosted() {}, openMural: () => dialog.show('<h2 id="modal-title">Many hands. One mural.</h2><button id="mural-scenes">Paint Scenes</button>'), ...over };
}
const RECOVERY = '<section data-recovery><h2 id="modal-title">Some progress went back.</h2><button id="recover-save">Keep this tab’s progress</button></section>';
// The habitat room to the orbital commons, pressed as tests/next-browser.mjs phase 2 presses it.
const TO_ORBIT = ['room-item-0', 'room-place-0', 'room-assist', 'room-item-2', 'room-place-1', 'room-assist', 'room-item-1', 'room-place-2', 'room-assist', 'room-assist', 'room-assist',
  'room-item-0', 'room-place-2', 'room-assist', 'room-place-0', 'room-assist', 'room-item-2', 'room-place-1', 'room-assist', 'room-item-1', 'room-place-2', 'room-assist', 'room-assist', 'room-assist',
  'room-place-0', 'room-place-1', 'room-assist'];
test('ending: a redraw that waits draws only the stage still on screen', async t => {
  let settle;
  const music = { label: () => 'Music: Off', on: () => false, toggle: () => new Promise(resolve => { settle = resolve; }) }, flush = async () => { for (let i = 0; i < 20; i++) await null; };
  await t.test('Mural Stories: Music, then Back to Mural before the music has started', async () => {
    const dialog = fakeDialog(), ending = createEnding(endingHost(dialog, full(), { music }));
    assert.equal(ending.open('stories'), true); dialog.click('ending-music'); dialog.click('scene-back');
    settle(); await flush();
    assert.deepEqual([ending.stage, dialog.heading()], [null, 'Many hands. One mural.']);
  });
  await t.test('the hosted view: Music, then Back', async () => {
    const dialog = fakeDialog(), ending = createEnding(endingHost(dialog, full(), { music }));
    assert.equal(ending.open('hosted'), true); dialog.click('ending-music'); dialog.click('hosted-back');
    settle(); await flush();
    assert.deepEqual([ending.stage, dialog.modal.open], [null, false]);
  });
  await t.test('the screening: Music, then Helper workshop', async () => {
    const dialog = fakeDialog(), ending = createEnding(endingHost(dialog, full(), { music }));
    assert.equal(ending.open('screening'), true); dialog.click('ending-music'); dialog.click('screen-helper');
    settle(); await flush();
    assert.deepEqual([ending.stage, dialog.has('bench-assist')], ['bench', true]);
  });
  await t.test("Music: Godot's music announcement is said after the redraw, as refresh(false) leaves it", async () => {
    const dialog = fakeDialog(), said = [];
    const host = endingHost(dialog, full(), { status: text => said.push(text), music: { label: () => 'Music: Off', on: () => false, toggle: async () => 'Music paused.' } });
    const ending = createEnding({ ...host, show: html => { said.push('show'); dialog.show(html); } });
    for (const kind of ['hosted', 'screening', 'stories']) {
      assert.equal(ending.open(kind), true); said.length = 0; dialog.click('ending-music'); await flush();
      assert.deepEqual([ending.stage, said], [kind, ['show', 'Music paused.']], kind);
    }
  });
  await t.test('the orbital commons: the recovery offer covers a walk in progress', () => {
    const dialog = fakeDialog(), ending = createEnding(endingHost(dialog, full()));
    assert.equal(ending.open('room'), true); for (const id of TO_ORBIT) dialog.click(id);
    assert.equal(ending.stage, 'orbit');
    dialog.click('orbit-0'); dialog.frames(3); assert.equal(ending.snapshot().moving, true, 'walking to the first destination');
    dialog.show(RECOVERY); dialog.frames(600);
    assert.deepEqual([dialog.heading(), dialog.has('recover-save'), ending.snapshot().moving], ['Some progress went back.', true, false], 'the walk halts under the offer and draws nothing over it');
  });
});
// Chrome closes a <dialog> at once but delivers its close event as a later task. When a screen opens the dialog again in the frame
// between (an automated tester, a held key, a hand-off in code), that late event reaches every close listener while the dialog
// shows the new screen. modalEvents(dialog), called before the module adds its listeners, keeps them: closeLater() closes the
// stand-in without its event and returns the late delivery; escape() is the browser's Escape: the cancel event, then the close
// unless a listener prevented it.
function modalEvents(dialog) {
  const listeners = { close: [], cancel: [] }, add = dialog.modal.addEventListener;
  dialog.modal.addEventListener = (type, fn) => { listeners[type]?.push(fn); add(type, fn); };
  return {
    closeLater() { dialog.modal.open = false; return () => { for (const fn of listeners.close) fn({ type: 'close' }); }; },
    escape() {
      const event = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
      for (const fn of listeners.cancel) fn(event);
      if (!event.defaultPrevented) dialog.close();
      return event.defaultPrevented;
    },
  };
}
test("ending: an earlier dialog's late close event leaves the screen opened since alone; a real close still ends it", async t => {
  function setup() {
    const dialog = fakeDialog(), events = modalEvents(dialog), toasts = [], said = [], io = { state: full() };
    const ending = createEnding(endingHost(dialog, io.state, { getState: () => io.state, status: text => said.push(text), toast: text => toasts.push(text) }));
    return { dialog, events, toasts, said, io, ending };
  }
  // The habitat room to the orbital commons, and a walk to the first destination under way.
  function walking() {
    const e = setup();
    assert.equal(e.ending.open('room'), true); for (const id of TO_ORBIT) e.dialog.click(id);
    e.dialog.click('orbit-0'); e.dialog.frames(3);
    assert.deepEqual([e.ending.stage, e.ending.snapshot().moving], ['orbit', true]);
    return e;
  }
  await t.test('the screening, closed and opened again in one frame: the late close keeps the stage, its frame and its Escape', () => {
    const e = setup();
    assert.equal(e.ending.open('screening'), true); e.dialog.click('screen-frame-2');
    const deliver = e.events.closeLater(); // ×: the dialog closes at once, its close event a task later
    assert.equal(e.ending.open('screening'), true); // and the screening opens again before that event arrives
    deliver();
    assert.deepEqual([e.ending.stage, e.ending.snapshot().visit.screenFrame, e.dialog.heading()], ['screening', 2, 'The Open Seat | 3 / 3'], 'the late close changes nothing');
    assert.equal(e.events.escape(), true, "Escape still runs the screening's own Back");
    assert.deepEqual([e.ending.stage, e.dialog.modal.open, e.toasts], [null, false, [SC.screeningClose()]], "with Godot's words");
  });
  await t.test("Mural Stories, opened over another dialog's close in the same frame: Escape still goes back to the mural workshop", () => {
    const e = setup();
    e.dialog.show(RECOVERY);
    const deliver = e.events.closeLater();
    assert.equal(e.ending.open('stories'), true);
    deliver();
    assert.equal(e.ending.stage, 'stories', 'the late close changes nothing');
    assert.equal(e.events.escape(), true, 'Escape runs Back to Mural');
    assert.deepEqual([e.ending.stage, e.dialog.heading(), e.said.at(-1)], [null, 'Many hands. One mural.', MU.closeStoriesAnnouncement(full().muralScenes)]);
  });
  await t.test('the orbital commons: a walk under way keeps walking through the late close; a real close afterwards halts it as before', () => {
    const e = walking();
    const deliver = e.events.closeLater();
    assert.equal(e.ending.open('room'), true); // the room opens again on the commons, the walk still under way
    deliver();
    const kept = e.ending.snapshot();
    assert.deepEqual([e.ending.stage, kept.moving], ['orbit', true], 'the late close neither halts the walk nor ends the stage');
    e.dialog.frames(3);
    const before = e.ending.snapshot();
    assert.notDeepEqual(before.visit.orbit.player, kept.visit.orbit.player, 'the walker goes on frame by frame');
    e.dialog.close(); // ×, its close event on time
    const after = e.ending.snapshot();
    assert.deepEqual([after.stage, after.moving, after.visit.orbit], [null, false, O.halt(before.visit.orbit).orbit], 'the real close halts the walk as halt() does and ends the stage');
    e.dialog.frames(600);
    assert.deepEqual(e.ending.snapshot(), after, 'and no frame moves anyone after it');
  });
  await t.test('a late close that arrives under another screen still ends the stage, as on time: no stage is left open behind it', () => {
    const e = walking();
    const deliver = e.events.closeLater(); // × closes the commons
    e.dialog.show(RECOVERY); // and the recovery offer opens the dialog before the close event arrives
    deliver();
    assert.deepEqual([e.ending.stage, e.ending.snapshot().moving, e.dialog.heading()], [null, false, 'Some progress went back.']);
    e.io.state = stateOf(hostedEnvelope());
    assert.deepEqual([e.ending.sync({ adopted: true }).closed, e.dialog.heading()], [false, 'Some progress went back.'], 'so a later sync() cannot take the offer away for a stage that is gone');
  });
});
test("ending sync: a screen an adopted save's new copies close is reported, so game.js can say why; this tab's own change keeps it", () => {
  const s = full(), dialog = fakeDialog(), flip = st => { const next = structuredClone(st); next.film.result.framing = next.film.result.framing === 'wide' ? 'close' : 'wide'; return next; };
  let state = s;
  const ending = createEnding(endingHost(dialog, s, { getState: () => state }));
  assert.equal(ending.open('screening'), true);
  state = flip(state);
  assert.deepEqual([ending.sync(), ending.stage, dialog.modal.open], [{ reset: false, closed: false }, 'screening', true], "this tab's own change keeps the visit and the screen");
  assert.deepEqual([ending.sync({ adopted: true }), ending.stage], [{ reset: false, closed: false }, 'screening'], 'an adopted save with the same copies keeps them');
  state = flip(state);
  assert.deepEqual([ending.sync({ adopted: true }), ending.stage, dialog.modal.open], [{ reset: true, closed: true }, null, false], 'new copies start the visit over and close the screen');
  state = flip(state);
  assert.deepEqual(ending.sync({ adopted: true }), { reset: true, closed: false }, 'with no screen open there is nothing to close');
});

// ---------- Mural Stories admission sizes the save as Godot holds it (hardening review, November 1, 2026) ----------
import { SAVE_BUDGET, MOTIFS, freshEnvelope, cleanSurprises, utf8Bytes, canonicalStringify } from '../browser-next/godot-save.js';
// Godot's own admission (main.gd edit_mural_scene) over the save as Godot holds it once apply_save_envelope loaded it: only the
// keys build_save_envelope writes, with the ones it always writes added, the lenient values cleaned, save_seq one higher and the
// scenes in memory. Worked out here without godot-save.js's own sizing.
function godotHeldBytes(text, scenes) {
  const env = load(text).envelope, out = { active_motif: 'sun', discovered_surprises: [], district_boundary_visible: true };
  for (const key of Object.keys(freshEnvelope())) if (Object.hasOwn(env, key)) out[key] = env[key];
  if (!MOTIFS.includes(out.active_motif)) out.active_motif = 'sun';
  out.discovered_surprises = cleanSurprises(out.discovered_surprises);
  if (Object.keys(scenes).length) out.mural_scenes = scenes;
  return utf8Bytes(canonicalStringify({ ...out, save_seq: env.save_seq + 1 }));
}
const godotAdmits = (text, state, next) => { const current = godotHeldBytes(text, state.muralScenes), candidate = godotHeldBytes(text, next.muralScenes); return !(candidate > SAVE_BUDGET && candidate > current); };
const sceneEdit = (state, id, slot) => applyAction(state, { type: 'mural-scene', id, slot });
const fullRunWith = change => { const env = JSON.parse(GODOT_WRITTEN.fullRun); change(env); return JSON.stringify(env); };
const futureIds = n => Array.from({ length: n }, (_, i) => `future_surprise_id_${String(i).padStart(3, '0')}_abcdef`);
const motifAndPad = pad => fullRunWith(env => { env.active_motif = 'z'.repeat(2520); env.optional.pad = 'x'.repeat(pad); });

test('Mural Stories admission sizes the save as Godot holds it: what Godot cleans on load never refuses a paint the write saves', () => {
  inOrder(gdLines(gdFunc('main.gd', 'edit_mural_scene')), ['var current := build_save_envelope()', 'current["save_seq"] = save_seq + 1', 'var current_bytes := JSON.stringify(current).to_utf8_buffer().size()',
    'var candidate := build_save_envelope()', 'candidate["save_seq"] = save_seq + 1', 'var candidate_bytes := JSON.stringify(candidate).to_utf8_buffer().size()',
    'if candidate_bytes > SAVE_BUDGET_MAX_BYTES and candidate_bytes > current_bytes:'], 'main.gd edit_mural_scene sizes the save Godot holds');
  // Near or over the budget only through what Godot's load cleans or drops: Godot admits the paint and the write saves it.
  const admitted = {
    'an active_motif of 2520 characters': env => { env.active_motif = 'z'.repeat(2520); },
    'discovered_surprises of 100 ids no Godot knows': env => { env.discovered_surprises = futureIds(100); },
    'discovered_surprises that is not an Array': env => { env.discovered_surprises = 'x'.repeat(2512); },
    'a key no Godot writes beside an active_motif of 2520 characters': env => { env.zz_future = 'q'.repeat(100); env.active_motif = 'z'.repeat(2520); },
    'a 2500-character key no Godot writes': env => { env.zz_future = 'q'.repeat(2500); },
    'an active_motif of 2520 characters beside 2500 characters of optional': env => { env.active_motif = 'z'.repeat(2520); env.optional.pad = 'x'.repeat(2500); },
    // A paint rewrites mural_scenes by Godot's rules, so junk there never refused one.
    'mural_scenes with a 2490-byte junk key': env => { env.mural_scenes = { left: 'music', right: 'garden', junk: 'y'.repeat(2490) }; },
  };
  for (const [label, change] of Object.entries(admitted)) {
    const text = fullRunWith(change), r = load(text);
    for (const id of ['painting', 'cooking']) {
      const next = sceneEdit(r.state, id, 'right'), out = buildGodotSave(r.envelope, next);
      assert.deepEqual([godotAdmits(text, r.state, next), out.ok], [true, true], `${label}, ${id}: Godot admits and the write saves (${out.reason} ${out.bytes} B)`);
      assert.equal(sceneAdmission(r.envelope, r.state, next), true, `${label}, ${id}`);
    }
  }
  // Still over the budget once Godot cleaned it: refused, as Godot refuses it; a lift there is admitted, as Godot admits it.
  for (const pad of [2505, 2510]) {
    const text = motifAndPad(pad), r = load(text), next = sceneEdit(r.state, 'painting', 'right');
    assert.deepEqual([godotAdmits(text, r.state, next), buildGodotSave(r.envelope, next).reason, sceneAdmission(r.envelope, r.state, next)], [false, 'full', false], `optional ${pad}`);
    assert.equal(sceneAdmission(r.envelope, r.state, sceneEdit(r.state, '', 'right')), true, `optional ${pad}: a lift`);
  }
});

test("Mural Stories: a paint the cleaned save fits is painted; one Godot's budget refuses says Godot's line and changes nothing", () => {
  assert.ok(gdStrings(gdFunc('main.gd', 'edit_mural_scene')).includes(MU.sceneRefusal()), "the refusal is edit_mural_scene's own line");
  for (const [pad, painted] of [[2500, true], [2505, false]]) {
    const r = load(motifAndPad(pad)), acts = [], said = [], dialog = fakeDialog();
    const ending = createEnding(endingHost(dialog, r.state, { status: line => said.push(line), act: action => acts.push(action), sceneAdmission: next => sceneAdmission(r.envelope, r.state, next) }));
    assert.equal(ending.open('stories'), true);
    dialog.click('scene-choice-2'); dialog.click('scene-target-1');
    assert.deepEqual(acts, painted ? [{ type: 'mural-scene', id: 'painting', slot: 'right' }] : [], `optional ${pad}`);
    assert.equal(said.at(-1) === MU.sceneRefusal(), !painted, `optional ${pad}: ${said.at(-1)}`);
  }
});

test("Mural Stories admission agrees with the write over random saves: a paint the write saves is admitted, and the admission is Godot's own", () => {
  let seed = 20261101;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32, pick = list => list[Math.floor(rnd() * list.length)], int = n => Math.floor(rnd() * n);
  const bases = [GODOT_WRITTEN.fullRun, GODOT_WRITTEN.fullRunScenes, GODOT_WRITTEN.firstMeeting, raw(openedEnvelope()), raw(hostedEnvelope()), raw(filmDoneEnvelope())];
  const tally = { saved: 0, refused: 0, visitOnlyReserve: 0, visitOnlyShrink: 0, savedAtBudget: 0 };
  for (let n = 0; n < 1000; n++) {
    const env = JSON.parse(pick(bases)), junk = 1500 + int(2000), split = rnd();
    env.save_seq = pick([8, 9, 98, 99, 113, 999, int(300)]);
    if (rnd() < 0.4) env.active_motif = pick(['wave', '', 5, null, 'z'.repeat(Math.round(junk * split))]);
    if (rnd() < 0.4) env.discovered_surprises = pick([futureIds(Math.round(junk * split / 32)), 'x'.repeat(Math.round(junk * split)), [...cleanSurprises(env.discovered_surprises), 'cutesy_dino', 'cutesy_dino', 7]]);
    if (rnd() < 0.3) env.mural_scenes = pick([{ left: 'music', right: 'music' }, { left: 'garden', junk: 'y'.repeat(Math.round(junk * split)) }, { right: 'sharing' }, {}]);
    if (rnd() < 0.3) env[pick(['zz_future', 'later_key'])] = 'q'.repeat(Math.round(junk * (1 - split)));
    if (rnd() < 0.5) env.optional = { ...env.optional, pad: 'x'.repeat(rnd() < 0.5 ? Math.round(junk * (1 - split)) + int(400) : 1500 + int(2400)) };
    const text = JSON.stringify(env), r = parseGodotSave(text, { initialState });
    if (r.status !== 'loaded') continue;
    const next = sceneEdit(r.state, pick(['cooking', 'sharing', 'painting', 'music', 'garden', '']), pick(['left', 'right']));
    if (next === r.state) continue;
    const out = buildGodotSave(r.envelope, next), admits = sceneAdmission(r.envelope, r.state, next), label = `case ${n}: ${out.ok ? 'saved' : out.reason} ${out.bytes} B`;
    assert.ok(!out.ok || admits, `${label}: a paint the write saves is admitted`);
    assert.equal(admits, godotAdmits(text, r.state, next), `${label}: the admission is Godot's own, over the save as Godot holds it`);
    assert.ok(!admits || out.ok || out.reason === 'full', `${label}: an admitted paint that is not saved is visit-only for the budget alone`);
    // Admitted but visit-only, as Godot admits it too: within Godot's 4096 bytes but not the fork's room for Godot's next write, or
    // a paint that does not grow a save already over the budget.
    const visitOnly = godotHeldBytes(text, next.muralScenes) <= SAVE_BUDGET ? 'visitOnlyReserve' : 'visitOnlyShrink';
    tally[out.ok ? 'saved' : admits ? visitOnly : 'refused']++;
    if (out.ok && utf8Bytes(canonicalStringify(r.envelope)) > SAVE_BUDGET - 40) tally.savedAtBudget++;
  }
  assert.ok(tally.saved > 300 && tally.refused > 40 && tally.visitOnlyShrink > 10 && tally.savedAtBudget > 100, JSON.stringify(tally));
});

test("Mural Stories admission is Godot's own on what the stored save hides: a paint Godot refuses is refused with its line", () => {
  // Each looked as if it fits only through what Godot's load rewrites, and each write is visit-only: mural_scenes junk the paint
  // drops (a shrink as stored), an older save without two keys Godot always writes, and an active_motif Godot reloads as "sun".
  const hidden = {
    'mural_scenes junk beside 2505 characters of optional': env => { env.optional.pad = 'x'.repeat(2505); env.mural_scenes = { left: 'music', right: 'garden', junk: 'y'.repeat(100) }; },
    'an older save without active_motif and district_boundary_visible': env => { delete env.active_motif; delete env.district_boundary_visible; env.optional.pad = 'x'.repeat(2510); },
    'an active_motif of 5': env => { env.active_motif = 5; env.optional.pad = 'x'.repeat(2503); },
  };
  for (const [label, change] of Object.entries(hidden)) {
    const text = fullRunWith(change), r = load(text), next = sceneEdit(r.state, 'painting', 'right');
    assert.deepEqual([godotAdmits(text, r.state, next), buildGodotSave(r.envelope, next).reason, sceneAdmission(r.envelope, r.state, next)], [false, 'full', false], label);
    const acts = [], said = [], dialog = fakeDialog();
    const ending = createEnding(endingHost(dialog, r.state, { status: line => said.push(line), act: action => acts.push(action), sceneAdmission: edit => sceneAdmission(r.envelope, r.state, edit) }));
    assert.equal(ending.open('stories'), true);
    dialog.click('scene-choice-2'); dialog.click('scene-target-1');
    assert.deepEqual([acts, said.at(-1)], [[], MU.sceneRefusal()], `${label}: Godot's line, and nothing is painted`);
  }
  // One byte short of Godot's budget the same saves are admitted, and the write saves them: admission and write meet at 4096.
  for (const change of [env => { delete env.active_motif; delete env.district_boundary_visible; env.optional.pad = 'x'.repeat(2501); }, env => { env.active_motif = 5; env.optional.pad = 'x'.repeat(2501); }]) {
    const text = fullRunWith(change), r = load(text), next = sceneEdit(r.state, 'painting', 'right');
    assert.deepEqual([godotHeldBytes(text, next.muralScenes), sceneAdmission(r.envelope, r.state, next), buildGodotSave(r.envelope, next).ok], [SAVE_BUDGET, true, true]);
  }
});
