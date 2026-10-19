import { SAVE_KEY, SETTINGS_KEY, LITTER, MOTIFS, FURNITURE, PALETTES, SIGNS, LOANS, PHOTO_GUESTS, initialState, loadSave, serializeSave, applyAction, progress, ready, canPlaceFurniture, occupiedCells, walkable, findPath } from './core.js';
import { World, makeWays, NEIGHBORS, PLACES, PALETTE_COLORS } from './world.js';
import { BLACK_HAWK } from './history.js';
import { districtGeometry } from './district.js';
import { Soundtrack } from './soundtrack.js';
import { PHOTO_RESPONSES, postcardSVG } from './keepsake.js';
import { gatheringScene, gatheringPlanSVG } from './gathering.js';
import { SEGMENTS, segment, programmeIssue, programmeTitle, programmeSVG, programmeResponse } from './programme.js';
import { currentActivity, hostedResult, hostingResponse, activitySummary, tilePanelSVG, STORY_CHOICES, QUIET_CHOICES } from './hosting.js';
import { ExperimentHost } from './experimental-host.js';
import { CIVIC_TOPICS, CIVIC_FORMATS, CIVIC_NOTES, civicAvailable, civicResponse, civicConversation, civicPlanSVG } from './civic.js';
import { FILM_SHOTS, FILM_FRAMING, FILM_PLANS, filmAvailable, filmResponse, filmCaption, filmFrameSVG } from './film.js';

const $ = selector => document.querySelector(selector);
const modal = $('#modal'), body = $('#modal-body'), canvas = $('#world');
let modalReturnTarget = canvas;
const music = new Soundtrack({ onChange: soundUI });
let state = initialState(), recovery = false, storageAvailable = true, savedMessage = '';
let settings = { volume: .35, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, experimental: { neighborhoodVoices: false } };
try {
  const loaded = loadSave(localStorage.getItem(SAVE_KEY)); state = loaded.state; recovery = !!loaded.recovery; savedMessage = loaded.message;
} catch { storageAvailable = false; }
try {
  const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  const stored = parsed && typeof parsed === 'object' ? parsed : {};
  if (typeof stored.reducedMotion === 'boolean') settings.reducedMotion = stored.reducedMotion;
  if (Number.isFinite(stored.volume)) settings.volume = Math.max(0, Math.min(.8, stored.volume));
  settings.experimental.neighborhoodVoices = stored.experimental?.neighborhoodVoices === true;
} catch { /* Invalid preferences do not make a valid game save unavailable. */ }
music.setVolume(settings.volume);
document.documentElement.classList.toggle('reduced-motion', settings.reducedMotion);
let world, ways, toastTimeout, activeTool = 'table', activeMotif = 'sun', lastFrame = 0, lastSave = 0, lastHint = 0;
let walkTarget = null, walkPath = [], keys = new Set(), moved = false;
let districtStatus = 'idle', districtPromise;
let voicesModulePromise, voicesImportAttempt = 0;
const voicesHost = new ExperimentHost({
  load: async scope => {
    if (!voicesModulePromise) {
      const suffix = voicesImportAttempt++ ? `?retry=${voicesImportAttempt}` : '';
      voicesModulePromise = import(`./experiments/neighborhood-voices.js${suffix}`).catch(error => { voicesModulePromise = null; throw error; });
    }
    const module = await voicesModulePromise;
    if (typeof module.activate !== 'function') { voicesModulePromise = null; throw Error('Optional module unavailable'); }
    return scope.active() ? module.activate(scope) : null;
  },
  onChange: voicesUI,
  onDisable: () => {
    if (settings.experimental.neighborhoodVoices) { settings.experimental.neighborhoodVoices = false; saveSettings(); }
    if (body.querySelector('[data-neighborhood-voices]')) { showSettings(); modalReturnTarget = $('#settings-button'); $('#voices-enabled').focus({ preventScroll: true }); $('#voices-enabled').scrollIntoView({ block: 'nearest' }); }
  },
  present: html => { show(html); modalReturnTarget = $('#voices-button'); $('#modal-title').focus({ preventScroll: true }); },
  closeView: () => close($('#voices-button')),
});
function voicesUI() {
  $('#voices-button').hidden = !voicesHost.enabled;
  if ($('#voices-enabled')) $('#voices-enabled').checked = voicesHost.enabled;
  const status = voicesHost.status === 'ready' ? 'Ready. Read the organization cards whenever you like.' : voicesHost.status === 'error' ? 'The experiment could not load. Core play is ready; retry or turn it off.' : voicesHost.status === 'paused' ? 'Paused while away. Open Neighborhood Voices to resume.' : voicesHost.enabled ? 'Loading the optional organization cards…' : 'Off. No optional cards or recordings are active.';
  if ($('#voices-settings-status')) $('#voices-settings-status').textContent = status;
  if (!$('#voices-load-state')) return;
  $('#voices-load-state').textContent = status;
  const retry = $('#voices-retry');
  if (document.activeElement === retry && voicesHost.status !== 'error') $('#modal-title').focus({ preventScroll: true });
  retry.hidden = voicesHost.status !== 'error';
  $('#voices-read').hidden = voicesHost.status !== 'ready';
}
function setVoicesEnabled(enabled) { settings.experimental.neighborhoodVoices = enabled; saveSettings(); voicesHost.setEnabled(enabled); }
function openVoices() {
  if (!voicesHost.enabled) return;
  if (voicesHost.status === 'paused') voicesHost.resume();
  if (voicesHost.status === 'ready' && voicesHost.open()) return;
  show(`<section data-neighborhood-voices><span class="eyebrow">EXPERIMENTAL · OPTIONAL</span><h2 id="modal-title" tabindex="-1">Neighborhood Voices</h2><p>Three dated organization cards, text only. Your gathering does not depend on this experiment.</p><p id="voices-load-state" role="status"></p><div class="button-row"><button id="voices-read" class="primary-button" hidden>Read the organization cards</button><button id="voices-retry" class="secondary-button" hidden>Retry the experiment</button>${button('voices-off', 'Turn off Neighborhood Voices')}${button('voices-back', 'Back to the block')}</div></section>`);
  modalReturnTarget = $('#voices-button'); $('#modal-title').focus({ preventScroll: true });
  bind('voices-read', openVoices); bind('voices-retry', () => voicesHost.retry()); bind('voices-off', () => setVoicesEnabled(false)); bind('voices-back', () => close($('#voices-button'))); voicesUI();
}

function toast(text) { $('#toast').textContent = text; $('#toast').classList.add('show'); clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $('#toast').classList.remove('show'), 4300); }
function persist() {
  if (recovery) { $('#save-status').textContent = 'Save recovery: choose “Use this new afternoon” in Settings to save.'; return; }
  try { localStorage.setItem(SAVE_KEY, serializeSave(state)); storageAvailable = true; $('#save-status').textContent = 'Saved on this device. Your afternoon can wait.'; }
  catch { storageAvailable = false; $('#save-status').textContent = 'Saving is unavailable. Keep this tab open to retain progress.'; }
}
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { toast('Settings will last for this visit; browser storage is unavailable.'); } }
function act(action) { state = applyAction(state, action); updateUI(); persist(); }
function show(html) {
  voicesHost.dismiss();
  const focused = modal.open ? document.activeElement?.id : null;
  body.innerHTML = html;
  if (!modal.open) { modalReturnTarget = canvas; keys.clear(); modal.showModal(); }
  const previous = focused ? document.getElementById(focused) : null;
  if (!previous || !modal.contains(previous)) modal.scrollTop = 0;
  const focusTarget = previous && modal.contains(previous) && !previous.disabled ? previous : body.querySelector('button:not([disabled]):not([hidden]),a[href]:not([hidden]),input:not([disabled]):not([hidden])') || $('#close-modal');
  focusTarget.focus({ preventScroll: true });
  $('#modal-status').textContent = body.querySelector('.grid-message')?.textContent || '';
}
function returnFocus() { return modalReturnTarget.isConnected ? modalReturnTarget : document.getElementById(modalReturnTarget.id) || canvas; }
function focusReturn() { const target = returnFocus(); target.focus({ preventScroll: true }); if (['civic-hour', 'film-shoot'].includes(target.id)) target.scrollIntoView({ block: 'nearest' }); }
function close(target = canvas) { voicesHost.dismiss(); modalReturnTarget = target instanceof HTMLElement ? target : canvas; modal.close(); focusReturn(); }
function bind(id, callback) { document.getElementById(id)?.addEventListener('click', callback); }
function button(id, label, primary = false, disabled = false) { return `<button id="${id}" class="${primary ? 'primary-button' : 'secondary-button'}" ${disabled ? 'disabled' : ''}>${label}</button>`; }
function characterHeader(id) { const n = NEIGHBORS.find(n => n.id === id), film = filmResponse(id, state.film), civic = civicResponse(id, state.civic), response = film || civic || hostingResponse(id, state.hosting) || programmeResponse(id, state.programme.published); return `<div class="character-heading"><span class="portrait" style="background:${n.coat}55">${n.name[0]}</span><div><h2 id="modal-title">${n.name}</h2><span class="eyebrow">${n.role.toUpperCase()}</span></div></div>${response ? `<div class="programme-response"><span class="eyebrow">${film ? 'AFTER OUR LITTLE FILM' : civic ? 'AFTER OUR LISTENING HOUR' : state.hosting.order.length ? 'OUR SHARED AFTERNOON' : 'ABOUT OUR NEXT AFTERNOON'}</span><p>${response}</p></div>` : ''}`; }
function updateUI() {
  const p = progress(state), count = Object.values(p).filter(Boolean).length;
  $('#progress-label').textContent = `${count} of 4 preparations`; $('#progress-percent').textContent = `${count * 25}%`; $('#progress-fill').style.width = `${count * 25}%`;
  const tasks = [
    { id: 'layout', title: 'Make room for everyone', detail: p.layout ? `${state.layout === 'table' ? 'Long Table' : 'Open Floor'} · route stays clear` : state.layout ? `${Object.keys(state.furniture).length}/3 supplies arranged · keep a clear route` : 'Start with Bea. Pick a layout together.' },
    { id: 'tidy', title: 'A little tidying', detail: p.tidy ? 'The three litter spots are cleared.' : `${state.litter.length}/3 litter spots · belongings stay put` },
    { id: 'mural', title: 'A mural made together', detail: p.mural ? 'Three neighbors’ ideas, one original panel.' : `${Object.keys(state.mural).length}/3 ideas · compose with Celeste` },
    { id: 'sound', title: 'Find the right sound', detail: p.sound ? state.epilogue.packing ? 'Rook helped the gathering find its rhythm.' : 'Rook has the mix ready to go.' : 'Place the speaker, then check in with Rook.' },
  ];
  $('#tasks').innerHTML = tasks.map((task, i) => `<li class="task ${p[task.id] ? 'done' : ''}"><button id="task-${task.id}" aria-label="${task.title}. ${task.detail}"><span class="task-number">${p[task.id] ? '✓' : String(i + 1).padStart(2, '0')}</span><span class="task-content"><span class="task-title">${task.title}</span><span class="task-detail">${task.detail}</span></span><span class="task-arrow">↗</span></button></li>`).join('');
  bind('task-layout', () => goTo(NEIGHBORS[0]));
  bind('task-tidy', () => { const item = LITTER.find(i => !state.litter.includes(i.id)); if (item) goTo({ ...item, name: item.label }); else toast(state.epilogue.packing ? 'Those three litter spots are still tidy. One contribution to a shared afternoon.' : 'All three marked litter spots are tidy. The block is ready for company.'); });
  bind('task-mural', () => goTo(PLACES.find(p => p.id === 'mural')));
  bind('task-sound', () => goTo(NEIGHBORS.find(n => n.id === 'rook')));
  $('#open-gathering').disabled = !ready(state); $('#open-gathering').innerHTML = state.opened ? 'Enjoy the gathering <span>↗</span>' : 'Open the gathering <span>↗</span>';
  const stems = [['layout', 'Bass'], ['tidy', 'Brushes'], ['mural', 'Piano'], ['opened', 'Trumpet']];
  $('#stems').innerHTML = stems.map(([key, label]) => `<span class="stem ${(key === 'opened' ? state.opened : p[key]) ? 'active' : ''}"><i></i>${label}</span>`).join('');
  $('#sound-caption').textContent = state.epilogue.packing ? 'A shared afternoon, kept in your field notes.' : state.opened ? 'All four parts are ready. Stay a little longer.' : count ? `${count} preparations made. The music is taking shape.` : 'A quiet beginning. Each contribution adds a layer.';
  music.update({ ...p, opened: state.opened });
  if (state.layout === 'floor') { $('#neighbor-quote').textContent = state.opened ? '“Turns out a little room was all we needed to find the rhythm.”' : '“Leave a little open space. You never know who might start dancing.”'; $('#neighbor-credit').textContent = '— Dez, your neighbor'; }
  else { $('#neighbor-quote').textContent = state.opened ? '“See? We already had what mattered. Each other.”' : '“A long table, a few good stories. That’s my kind of afternoon.”'; $('#neighbor-credit').textContent = '— Bea, your neighbor'; }
  if (!storageAvailable) $('#save-status').textContent = 'Saving is unavailable. Keep this tab open to retain progress.';
  updateAfterglow();
  soundUI();
}

function soundUI() {
  const local = !!music.fileName;
  $('#sound-toggle').setAttribute('aria-pressed', String(music.enabled));
  $('#sound-toggle').setAttribute('aria-label', local ? music.enabled || music.starting ? 'Pause local track' : 'Play local track' : music.enabled || music.starting ? 'Mute music sketch' : 'Enable music sketch');
  $('#sound-toggle').textContent = local ? music.enabled || music.starting ? 'Ⅱ' : '▶' : '♫';
  $('#stems').hidden = local;
  $('#sound-heading').textContent = local ? 'YOUR NEIGHBORHOOD MIX' : 'THE BLOCK FINDS ITS RHYTHM';
  $('#sound-disclosure').textContent = local ? 'Local audio · this tab only' : 'Original synth sketch\nRecorded jazz to come';
  if (local) $('#sound-caption').textContent = music.error || `${music.enabled ? 'Playing' : music.starting ? 'Starting' : 'Ready'}: ${music.fileName}`;
  else {
    const count = Object.values(progress(state)).filter(Boolean).length;
    $('#sound-caption').textContent = state.epilogue.packing ? 'A shared afternoon, kept in your field notes.' : state.opened ? 'All four parts are ready. Stay a little longer.' : count ? `${count} preparations made. The music is taking shape.` : 'A quiet beginning. Each contribution adds a layer.';
  }
  if (music.error) $('#sound-caption').textContent = music.error;
  if ($('#soundtrack-status')) {
    const sketchStatus = music.starting ? 'Starting the synth sketch…' : music.enabled ? Object.values(progress(state)).some(Boolean) ? 'Synth sketch playing.' : 'The sketch is on. Its first part enters when the layout is ready.' : 'Original synth sketch selected. Press Play to listen.';
    $('#soundtrack-status').textContent = music.error || (local ? `${music.fileName} — ${music.enabled ? 'playing on repeat' : music.starting ? 'starting' : 'ready; press Play'}.` : sketchStatus);
    $('#track-play').textContent = music.enabled || music.starting ? 'Pause music' : 'Play music';
    const wasFocused = document.activeElement === $('#use-sketch');
    $('#use-sketch').disabled = !local;
    if (wasFocused && !local) $('#track-play').focus({ preventScroll: true });
  }
}
async function toggleMusic() {
  if (music.enabled || music.starting) music.stop();
  else if (await music.start() === false) toast(music.error || 'Audio is unavailable in this browser. All activities still work.');
  soundUI();
  if (!music.fileName && music.enabled && !Object.values(progress(state)).some(Boolean)) toast('Music is on. The first part enters when the layout is ready.');
}
function showMusic() {
  show(`<span class="eyebrow">SET THE MOOD</span><h2 id="modal-title">Your block. Your music.</h2><p>Bring a jazz track you made in Suno, or any MP3/WAV you want to try here. It plays on repeat while you explore.</p><label class="file-picker" for="soundtrack-file">Choose an MP3 or WAV<input id="soundtrack-file" type="file" accept=".mp3,.wav,audio/mpeg,audio/wav"></label><p id="soundtrack-status" class="track-status" role="status" aria-live="polite"></p><label class="settings-row" for="soundtrack-volume"><span>Music volume <span id="track-volume-number">${Math.round(settings.volume * 100)}%</span></span><input id="soundtrack-volume" type="range" min="0" max="80" value="${settings.volume * 100}"></label><div class="button-row">${button('track-play', 'Play music', true)}${button('use-sketch', 'Return to synth sketch')}${button('music-close', 'Back to the block')}</div><p class="footnote">The file stays on your device and is not uploaded or saved with your game. Choose it again after a reload. Up to 100 MB. Sound is always optional.</p>`);
  $('#soundtrack-file').addEventListener('change', event => {
    const file = event.target.files?.[0]; if (!file) return;
    try { music.loadFile(file); } catch (error) { music.error = error.message; soundUI(); }
    event.target.value = '';
  });
  $('#soundtrack-volume').addEventListener('input', event => { settings.volume = Number(event.target.value) / 100; music.setVolume(settings.volume); $('#track-volume-number').textContent = `${Math.round(settings.volume * 100)}%`; saveSettings(); });
  bind('track-play', toggleMusic); bind('use-sketch', () => music.useSketch()); bind('music-close', close); soundUI();
}

function updateAfterglow() {
  const panel = $('#afterglow'); panel.hidden = !state.opened;
  if (!state.opened) { panel.innerHTML = ''; return; }
  const { packing, returned, photo } = state.epilogue;
  const allReturned = LOANS.every(loan => returned.includes(loan.id)), scene = gatheringScene(state);
  panel.innerHTML = `<div class="afterglow-heading"><span class="eyebrow">${packing ? 'BORROWED WITH CARE' : 'THE AFTERNOON CONTINUES'}</span><h2>${packing ? allReturned ? 'Ready for another afternoon.' : 'A little thank-you lap.' : 'Stay a little longer.'}</h2><p>${packing ? allReturned ? 'The three loans are back with their neighbors. The mural and your memories stay. You can keep exploring.' : 'Bea folds her seats while you return three event loans. Take your time; the gathering is already complete.' : 'Make a keepsake, keep talking, or simply enjoy the block. When you’re ready, help pack up together.'}</p><p class="gathering-caption">${scene.caption}</p></div><div class="afterglow-actions">${button('see-gathering-plan', 'See your gathering plan ↗')}${photo.status === 'taken' ? button('view-keepsake', 'View your illustrated keepsake ↗') : !packing ? button('make-keepsake', photo.status === 'skipped' ? 'Changed your mind about a keepsake?' : 'Ask about a keepsake ↗') : '<p class="footnote">You kept this afternoon as a story. No picture was needed.</p>'}${!packing ? button('start-pack', 'When you’re ready, pack up') : `<div class="loan-list" aria-label="Optional event loans">${LOANS.map(loan => `<button id="visit-${loan.id}" class="loan-button ${returned.includes(loan.id) ? 'returned' : ''}" ${returned.includes(loan.id) ? 'disabled' : ''}><span>${returned.includes(loan.id) ? '✓' : '↗'}</span>${loan.label}<small>${returned.includes(loan.id) ? 'Returned · thank you' : `Return to ${NEIGHBORS.find(n => n.id === loan.owner).name}`}</small></button>`).join('')}</div>`}</div>`;
  bind('make-keepsake', () => photoConsent()); bind('view-keepsake', viewKeepsake); bind('start-pack', packingChoice);
  bind('see-gathering-plan', showGatheringPlan);
  panel.querySelector('.afterglow-actions').insertAdjacentHTML('beforeend', button('next-afternoon', state.programme.published.length ? 'Revisit our next afternoon ↗' : 'Plan another afternoon ↗'));
  bind('next-afternoon', () => programmeEditor());
  if (state.programme.published.length || state.hosting.order.length) {
    panel.querySelector('.afterglow-actions').insertAdjacentHTML('beforeend', button('host-afternoon', state.hosting.results.length === 4 ? 'Remember our second gathering ↗' : state.hosting.order.length ? 'Continue our second gathering ↗' : 'Host the posted programme ↗', true));
    bind('host-afternoon', () => hostingScreen());
  }
  if (civicAvailable(state)) {
    panel.querySelector('.afterglow-actions').insertAdjacentHTML('beforeend', `<div class="civic-invitation"><p>${state.civic.phase === 'done' ? 'Later on the block: a tenant listening hour, kept as a shared memory.' : 'A later afternoon: the neighbors want to talk about staying and thriving here. A peaceful tenant listening hour is ready whenever you are.'}</p>${button('civic-hour', state.civic.phase === 'done' ? 'Remember our listening hour ↗' : state.civic.phase === 'idle' ? 'A tenant listening hour ↗' : 'Continue our listening hour ↗')}</div>`);
    bind('civic-hour', () => civicScreen());
  }
  if (filmAvailable(state)) {
    panel.querySelector('.afterglow-actions').insertAdjacentHTML('beforeend', `<div class="civic-invitation"><p>A later fictional day: Celeste and Dez propose a tiny illustrated film, made around the neighbors’ needs.</p>${button('film-shoot', state.film.phase === 'done' ? 'Screen our little film ↗' : state.film.phase === 'idle' ? 'A little film on the block ↗' : 'Continue our little film ↗')}</div>`);
    bind('film-shoot', () => filmScreen());
  }
  LOANS.forEach(loan => bind(`visit-${loan.id}`, () => goTo(NEIGHBORS.find(n => n.id === loan.owner))));
  if (packing) { $('#open-gathering').innerHTML = 'Your afternoon <span>↗</span>'; $('#neighbor-quote').textContent = allReturned ? '“Everything borrowed is back. That makes next time easier.”' : '“I’ll fold the seats. You catch up with the others.”'; $('#neighbor-credit').textContent = '— Bea, your neighbor'; }
  if (state.hosting.order.length) { if (!packing) panel.querySelector('.afterglow-heading h2').textContent = 'Your opening afternoon.'; panel.querySelector('.gathering-caption').textContent = 'Opening chapter: ' + scene.caption; $('#open-gathering').innerHTML = 'Remember the opening <span>↗</span>'; }
}
function filmScreen(message = '', focusId = '', viewIndex = 0) {
  if (!filmAvailable(state)) return;
  const film = state.film, plan = film.result || film.draft;
  const index = Math.max(0, Math.min(2, viewIndex)), id = film.phase === 'shooting' ? plan.order[film.captured.length] : plan.order[index];
  const scroll = modal.open && !!$('#film-view') ? modal.scrollTop : 0;
  const picture = `<figure class="film-picture"><img alt="${FILM_SHOTS[id].label}. Original illustrated props${plan.framing === 'wide' ? ' and Celeste and Dez’s volunteered fictional hands' : ', with no people pictured'}." src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(filmFrameSVG(plan, id))}"><figcaption id="film-caption">${filmCaption(plan, id)}</figcaption></figure>`;
  let content;
  if (film.phase === 'idle') content = `<p>On a later fictional day, Celeste and Dez want to make <em>The Open Seat</em>, an original illustrated three-shot short. Arrange the shots, agree how the crew works and hold a take when someone needs the route. The finished sequence is yours to revisit.</p><div class="civic-voices"><p><strong>Celeste:</strong> “Our portable props are ours to film. Dez and I can offer our hands for a wider drawing.”</p><p><strong>Rook:</strong> “I’ll help cue the take, but keep me out of the picture.”</p><p><strong>Thanh:</strong> “I still need to get through. The crew can wait for a neighbor.”</p></div><p>The production accepts these terms: only the agreed props/volunteer hands, no other people, a clear route and a pause whenever it is needed.</p>${button('film-start', 'Help with the agreed shoot', true)}`;
  else if (film.phase === 'planning') content = `<p>Make the story by arranging three shots. Any order is welcome; the last image gives the ending a different feeling. All props and drawings are original, separate from real public art.</p>${[['framing','Agree the frame',FILM_FRAMING],['plan','Work around the neighbors',FILM_PLANS]].map(([key,label,options]) => `<fieldset class="civic-options"><legend>${label}</legend><div class="button-row">${Object.entries(options).map(([value,item]) => `<button id="film-${key}-${value}" class="secondary-button" aria-pressed="${plan[key] === value}">${item.label}</button>`).join('')}</div><p>${options[plan[key]].detail}</p></fieldset>`).join('')}${picture}<h3>Your shot order</h3><ol class="programme-order">${plan.order.map((shot,i) => `<li><strong>${FILM_SHOTS[shot].label}</strong><div class="button-row"><button id="film-up-${shot}" class="secondary-button" aria-label="Move ${FILM_SHOTS[shot].label} earlier" ${i===0?'disabled':''}>Earlier</button><button id="film-down-${shot}" class="secondary-button" aria-label="Move ${FILM_SHOTS[shot].label} later" ${i===2?'disabled':''}>Later</button></div></li>`).join('')}</ol><p>Rook stays off camera in either frame. Both setups keep the kit beside the route; the wider view needs a little more agreed prop space.</p>${button('film-roll','Agree this plan & prepare the take',true)}`;
  else if (film.phase === 'hold') content = `<p id="film-hold"><strong>Hold the take. Neighbors first.</strong> Thanh needs the through-route to carry a stool back. The crew leaves its kit beside the route and lets him pass.</p><p>${plan.plan === 'later' ? 'Rook waits until the conversation ends, then gives the agreed cue. There is no countdown; you can return later.' : 'Rook keeps the crew quiet while the conversation continues. Only soft props are used; the route stays available.'}</p><p>Thanh: “Thanks for waiting. I’m through; the route is clear for anyone else too.”</p>${button('film-clear','Thanh is through · take the first shot',true)}`;
  else if (film.phase === 'shooting') content = `<p><strong>Shot ${film.captured.length+1} of 3 · ${FILM_SHOTS[id].label}</strong></p>${picture}<p>${FILM_FRAMING[plan.framing].detail}</p><p>${FILM_PLANS[plan.plan].detail}</p><p>This captures an authored drawing in the game. It does not access a camera or microphone.</p>${button('film-capture',`Keep shot ${film.captured.length+1} · ${FILM_SHOTS[id].label}`,true)}`;
  else content = `<p>The crew clears its fictional kit and thanks the neighbors. The route remained available, Rook stayed off camera and no one had to take part. Your three captured drawings form this little screening.</p><p><strong>Frame ${index+1} of 3 · ${FILM_SHOTS[id].label}</strong></p>${picture}<div class="button-row" role="group" aria-label="Screening frames">${plan.order.map((shot,i) => `<button id="film-frame-${i}" class="secondary-button" aria-pressed="${i===index}">${i+1} · ${FILM_SHOTS[shot].label}</button>`).join('')}</div><p id="film-memory">Your ending is <strong>${FILM_SHOTS[plan.order[2]].label.toLowerCase()}</strong>. The shot order, frame and production choice are remembered. This is a silent illustrated sequence with captions, not a recorded movie or a real production announcement. The main music is unchanged.</p>`;
  show(`<section id="film-view"><span class="eyebrow">THE OPEN SEAT · FICTIONAL FILM PROJECT</span><h2 id="modal-title" tabindex="-1">${film.phase==='done'?'Our little film, together.':film.phase==='hold'?'A good take can wait.':'A little film on the block.'}</h2>${content}<p id="film-message" class="grid-message">${message}</p><div class="button-row">${button('film-back',['idle','done'].includes(film.phase)?'Back to the block':'Keep our place & return')}</div><p class="footnote">Original fictional storyboard/props and volunteered fictional hands. No real camera, microphone, film media, permit or current access-width claim. Map coordinates, other projects and soundtrack stay unchanged. Real historical film references are not part of this project.</p></section>`);
  modalReturnTarget = $('#film-shoot');
  const step = (type,extra={}) => event => { if(event.detail>1)return; act({type,...extra}); filmScreen(); };
  for(const type of ['start','roll','clear'])bind(`film-${type}`,step(`film-${type}`));
  bind('film-capture',event=>{if(event.detail>1)return;const before=state.film.captured.length;act({type:'film-capture',id});filmScreen(state.film.captured.length===before?'This shot is already kept. Here is the current take.':state.film.phase==='done'?'All three shots kept. Your screening is ready.':`Shot ${state.film.captured.length} kept. Next: shot ${state.film.captured.length+1} of 3.`);});
  for(const [key,options] of [['framing',FILM_FRAMING],['plan',FILM_PLANS]])for(const [value,item] of Object.entries(options))bind(`film-${key}-${value}`,event=>{if(event.detail>1)return;act({type:'film-choice',key,value});filmScreen(`${item.label} selected.`,`film-${key}-${value}`);});
  for(const shot of plan.order)for(const [direction,delta] of [['up',-1],['down',1]])bind(`film-${direction}-${shot}`,event=>{if(event.detail>1)return;act({type:'film-move',id:shot,direction:delta});const pos=state.film.draft.order.indexOf(shot),canRepeat=direction==='up'?pos>0:pos<2;filmScreen(`${FILM_SHOTS[shot].label} is now ${pos+1} of 3.`,`film-${canRepeat?direction:direction==='up'?'down':'up'}-${shot}`);});
  for(let i=0;i<3;i++)bind(`film-frame-${i}`,event=>{if(event.detail>1)return;filmScreen(`Frame ${i+1} of 3.`,`film-frame-${i}`,i);});
  bind('film-back',event=>{if(event.detail>1)return;close($('#film-shoot'));});
  if(focusId){modal.scrollTop=scroll;const target=document.getElementById(focusId);target?.focus({preventScroll:true});target?.scrollIntoView({block:'nearest'});}
  else{modal.scrollTop=0;$('#modal-title').focus({preventScroll:true});}
}
function civicScreen(message = '', focusId = '') {
  if (!civicAvailable(state)) return;
  const c = state.civic, plan = c.result || c.draft;
  const scroll = modal.open && !!$('#civic-view') ? modal.scrollTop : 0;
  let content;
  if (c.phase === 'idle') content = `<p>On a later fictional afternoon, Bea proposes a tenant listening hour: how can neighbors stay and thrive here? This is a peaceful organizing conversation, not a real scheduled event or an organization’s campaign.</p><div class="civic-voices"><p><strong>Bea:</strong> “I want repairs and staying put on the agenda.”</p><p><strong>Thanh:</strong> “I want people to come and go without blocking anyone’s way. Not everyone can stay for a whole meeting.”</p><p><strong>Celeste:</strong> “No one owes us a personal story or a signature.”</p><p><strong>Dez:</strong> “We can disagree and still make room to listen.”</p></div><p>Choose a focus, a quiet setup and whether to keep anonymous themes. Host when ready; you can leave and resume at any point. Packing and loan returns from the opening remain optional.</p>${button('civic-start', 'Help host the listening hour', true)}`;
  else if (c.phase === 'planning') {
    const groups = [['topic', 'A shared question', CIVIC_TOPICS], ['format', 'Make room for the conversation', CIVIC_FORMATS], ['notes', 'Agree what to keep', CIVIC_NOTES]];
    content = `<p>Choose where this conversation begins. The other priority stays part of what neighbors want to discuss next time. Both setups preserve a through-route without a microphone.</p>${groups.map(([key, label, options]) => `<fieldset class="civic-options"><legend>${label}</legend><div class="button-row">${Object.entries(options).map(([value, item]) => `<button id="civic-${key}-${value}" class="secondary-button" aria-pressed="${plan[key] === value}">${item.label}</button>`).join('')}</div><p>${key === 'topic' ? CIVIC_TOPICS[plan.topic].request : options[plan[key]].detail}</p></fieldset>`).join('')}<img class="civic-plan" alt="Schematic plan: seats and notice table stay beside an uninterrupted through-route. The selected format is described above." src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(civicPlanSVG(plan))}"><p class="footnote">Original fictional event setup, not a real street closure, permit or surveyed access plan. No map coordinates, main supplies or soundtrack are changed.</p>${button('civic-open', 'Welcome the listening hour', true)}`;
  } else {
    content = `<p><strong>${CIVIC_TOPICS[plan.topic].label}</strong> · ${CIVIC_FORMATS[plan.format].label} · ${CIVIC_NOTES[plan.notes].label}</p><img class="civic-plan" alt="The agreed fictional shared-space plan, with a clear through-route." src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(civicPlanSVG(plan))}"><p>${CIVIC_FORMATS[plan.format].detail}</p><div class="civic-voices">${civicConversation(plan).map(v => `<p><strong>${v.name}:</strong> ${v.text}</p>`).join('')}</div><p>${CIVIC_NOTES[plan.notes].detail}</p>${plan.notes === 'themes' ? `<div class="history-entry"><h3>Our shared request</h3><p>${CIVIC_TOPICS[plan.topic].request}</p><p>This authored draft stays in the game. It has not been sent to anyone.</p></div>` : '<p>No shared-request note was kept. The scripted scene can be revisited as a fictional game memory, not a transcript of real people.</p>'}${c.phase === 'meeting' ? `<p>The neighbors hold the conversation with your agreed setup. A disagreement stays open; no chore or meeting solves housing insecurity. Listening, passing and leaving are welcome.</p>${button('civic-close', 'Close the listening hour together', true)}` : '<p id="civic-memory">The listening hour is complete. Your setup and the neighbors’ differing responses are remembered; the other priority remains for another day. You can still explore and revisit either gathering.</p>'}`;
  }
  show(`<section id="civic-view"><span class="eyebrow">TENANT LISTENING HOUR · FICTIONAL</span><h2 id="modal-title" tabindex="-1">${c.phase === 'done' ? 'We made room to be heard.' : c.phase === 'meeting' ? 'A conversation, held together.' : 'Neighbors staying and thriving.'}</h2>${content}<p id="civic-message" class="grid-message">${message}</p><div class="button-row">${button('civic-back', ['idle', 'done'].includes(c.phase) ? 'Back to the block' : 'Keep our place & return')}</div><p class="footnote">All speakers and dialogue are fictional. No personal input, attendee list, recording, sign-up, real organization position or outbound message. The game remembers setup choices locally.</p></section>`);
  modalReturnTarget = $('#civic-hour');
  const step = type => event => { if (event.detail > 1) return; act({ type }); civicScreen(); };
  bind('civic-start', step('civic-start')); bind('civic-open', step('civic-open')); bind('civic-close', step('civic-close'));
  for (const [key, options] of [['topic', CIVIC_TOPICS], ['format', CIVIC_FORMATS], ['notes', CIVIC_NOTES]]) for (const [value, item] of Object.entries(options)) bind(`civic-${key}-${value}`, event => { if (event.detail > 1) return; act({ type: 'civic-choice', key, value }); civicScreen(`${item.label} selected.`, `civic-${key}-${value}`); });
  bind('civic-back', event => { if (event.detail > 1) return; close($('#civic-hour')); });
  if (focusId) { modal.scrollTop = scroll; const target = document.getElementById(focusId); target?.focus({ preventScroll: true }); target?.scrollIntoView({ block: 'nearest' }); }
  else { modal.scrollTop = 0; $('#modal-title').focus({ preventScroll: true }); }
}
function hostingScreen(message = '', focusId = '') {
  if (!state.opened) return;
  const host = state.hosting, id = currentActivity(host), draft = host.draft;
  if (!host.order.length) {
    if (programmeIssue(state.programme.published)) return programmeEditor();
    show(`<span class="eyebrow">A SECOND AFTERNOON · FICTIONAL</span><h2 id="modal-title">Let’s bring the programme to life.</h2><p>Bea has the invitations, Dez has a rhythm in mind, Celeste has prepared six tiles, and Thanh brings three stools. This gathering uses your posted running order.</p><ol>${state.programme.published.map(key => `<li>${segment(key).name} · ${segment(key).owner}</li>`).join('')}</ol><p>You decide when to begin and move on. Listening counts as taking part. You can leave, explore or close the game between activities. Your opening keepsake and optional returns remain in the opening chapter.</p><p class="footnote">Starting keeps a copy of this order for this gathering. Later programme revisions are future plans; they do not change the gathering you have started. This is an original fictional event with no real date or partnership.</p><div class="button-row">${button('host-begin', 'Begin our second afternoon ↗', true)}${button('host-close', 'Another time')}</div>`);
    modalReturnTarget = $('#host-afternoon');
    $('#modal-title').setAttribute('tabindex', '-1'); $('#modal-title').focus({ preventScroll: true });
    bind('host-begin', () => { stopWalk(); act({ type: 'host-start' }); hostingScreen('The neighbors are here. Take your time.'); });
    bind('host-close', () => close($('#host-afternoon'))); return;
  }
  const finished = !id, art = hostedResult(host, 'art'), previousScroll = $('#hosting-order') ? modal.scrollTop : 0;
  let activity = '';
  if (id === 'stories') activity = `<p>“An invitation, not an obligation,” says Bea. “Choose an opening question. I’ll offer the first story; anyone can pass or just listen.”</p><div class="host-choices">${Object.entries(STORY_CHOICES).map(([key, label]) => `<button id="host-story-${key}" class="secondary-button" aria-pressed="${draft.story === key}">${label}</button>`).join('')}</div><p>Bea’s opening: ${draft.story === 'memory' ? '“I remember a neighbor saving a chair for me when I was new here. A small thing that stayed.”' : '“I’d like a garden in a box, something we could tend together. Maybe someone has seeds.”'}</p>`;
  if (id === 'beats') activity = `<p>“Leave spaces as well as taps,” says Dez. Shape eight steps with him. Selected steps are taps; the others are rests. You can leave every step quiet and share a listening round.</p><div class="host-beats" aria-label="Eight-step visual rhythm">${Array.from({ length: 8 }, (_, i) => `<button id="host-beat-${i}" aria-label="Step ${i + 1}: ${draft.pattern & 1 << i ? 'tap' : 'rest'}" aria-pressed="${!!(draft.pattern & 1 << i)}">${i + 1}<small>${draft.pattern & 1 << i ? 'TAP' : 'rest'}</small></button>`).join('')}</div><p>This is a visual rhythm you can tap along with. It does not add a recording or change your optional soundtrack. ${draft.pattern ? 'Dez traces your pattern with a hand in the air.' : 'Dez lowers his hands. “We can listen together too.”'}</p>`;
  if (id === 'art') activity = `<p>Celeste brings six prepared tiles: circles, waves and rising triangles. Change each tile with a tap, or keep her starting arrangement. These are original portable panels, away from real buildings and existing art.</p><img class="host-art" alt="Your original six-tile panel; matching numbered controls are below." src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(tilePanelSVG(draft))}"><div class="host-tiles" aria-label="Six tiles, left to right, top to bottom">${draft.tiles.map((tile, i) => `<button id="host-tile-${i}" aria-label="Tile ${i + 1}: ${['circle', 'wave', 'triangle'][tile]}. Change shape." class="secondary-button">${i + 1} · ${['Circle', 'Wave', 'Triangle'][tile]}</button>`).join('')}</div><div class="host-choices">${['warm', 'cool'].map(key => `<button id="host-palette-${key}" class="secondary-button" aria-pressed="${draft.palette === key}">${key === 'warm' ? 'Warm' : 'Cool'} palette</button>`).join('')}</div>`;
  if (id === 'pause') activity = `<p>Thanh has brought three stools. “Keep the through-route open. An open arc, or a pair with a place someone can join?” Try both; the visitors on the block follow your choice. Nobody has to sit or stay.</p><div class="host-choices">${Object.entries(QUIET_CHOICES).map(([key, label]) => `<button id="host-quiet-${key}" class="secondary-button" aria-pressed="${draft.quiet === key}">${label}</button>`).join('')}</div><p>${draft.quiet === 'arc' ? 'The open arc makes a shared place to sit without closing the route.' : 'A pair makes room for a quiet conversation; the open seat leaves an invitation.'} This is an unhurried pause. Continue whenever you want; there is no timer.</p>`;
  show(`<span class="eyebrow">OUR SECOND AFTERNOON · ${finished ? 'SHARED AND REMEMBERED' : `${host.results.length + 1} OF 4`}</span><h2 id="modal-title">${finished ? 'We made room for another afternoon.' : `${segment(id).name} · ${segment(id).owner}`}</h2><ol id="hosting-order">${host.order.map((key, i) => `<li ${i === host.results.length ? 'aria-current="step"' : ''}>${i < host.results.length ? '✓ ' : ''}${segment(key).name}</li>`).join('')}</ol>${message ? `<p class="grid-message">${message}</p>` : ''}${finished ? `<p>Bea, Dez, Celeste, Rook and Thanh each helped make this gathering. The choices you shared remain in the block and in their conversations. You can keep exploring.</p>${art ? `<img class="host-art" alt="Completed original six-tile panel." src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(tilePanelSVG(art))}">` : ''}` : activity}<div class="button-row">${!finished ? button('host-complete', ({ stories: 'Share this invitation', beats: draft.pattern ? 'Share this pattern' : 'Share a listening round', art: 'Hang our panel', pause: 'Make room for this pause' })[id], true) : ''}${button('host-close', finished ? 'Back to our block' : 'Save & explore the block')}</div>${host.results.length ? `<details class="host-memories" ${finished ? 'open' : ''}><summary>What we shared</summary><ol>${host.results.map(result => `<li>${activitySummary(result)}</li>`).join('')}</ol></details>` : ''}<p class="footnote">This gathering keeps the running order you began with. Future programme edits stay separate. Original fictional neighbors and portable event art; no real event or performance is reproduced.</p>`);
  modalReturnTarget = $('#host-afternoon');
  const edit = (action, control) => { act(action); hostingScreen('', control); };
  for (const key of Object.keys(STORY_CHOICES)) bind(`host-story-${key}`, () => edit({ type: 'host-story', value: key }, `host-story-${key}`));
  for (let step = 0; step < 8; step++) bind(`host-beat-${step}`, () => edit({ type: 'host-beat', step }, `host-beat-${step}`));
  for (let cell = 0; cell < 6; cell++) bind(`host-tile-${cell}`, () => edit({ type: 'host-tile', cell }, `host-tile-${cell}`));
  for (const value of ['warm', 'cool']) bind(`host-palette-${value}`, () => edit({ type: 'host-palette', value }, `host-palette-${value}`));
  for (const value of Object.keys(QUIET_CHOICES)) bind(`host-quiet-${value}`, () => edit({ type: 'host-quiet', value }, `host-quiet-${value}`));
  bind('host-complete', event => {
    if (event.detail > 1) return;
    const previousCount = state.hosting.results.length;
    act({ type: 'host-complete', id });
    hostingScreen(state.hosting.results.length > previousCount ? activitySummary(state.hosting.results.at(-1)) : 'This part is already recorded. Here is where the gathering is now.');
  });
  bind('host-close', () => close($('#host-afternoon')));
  if (focusId) { const target = document.getElementById(focusId); modal.scrollTop = previousScroll; target?.focus({ preventScroll: true }); target?.scrollIntoView({ block: 'nearest' }); }
  else { modal.scrollTop = 0; $('#modal-title').setAttribute('tabindex', '-1'); $('#modal-title').focus({ preventScroll: true }); }
}
function programmeEditor(message = '', focusId = '') {
  if (!state.opened) return;
  const { order, published } = state.programme, issue = programmeIssue(order);
  const same = JSON.stringify(order) === JSON.stringify(published);
  const scroll = modal.open && !!$('#programme-order') ? modal.scrollTop : 0;
  show(`<span class="eyebrow">A NEIGHBOR-LED PROJECT · FICTIONAL</span><h2 id="modal-title">Make room for next time.</h2><p>Bea and Dez want to bring both ideas back. Arrange four proposals into a future afternoon. There is no date, deadline or new preparation list. You can come back to your draft.</p><div class="programme-proposals">${SEGMENTS.map(item => `<article><h3>${item.name} · ${item.owner}</h3><p>${item.pitch}</p>${button(`programme-add-${item.id}`, order.includes(item.id) ? `${item.name} added` : `Add ${item.name}`, false, order.includes(item.id))}</article>`).join('')}</div><h3 id="programme-order-heading" tabindex="-1">Your running order</h3><ol id="programme-order" class="programme-order">${order.map((id, i) => `<li><strong>${segment(id).name}</strong><div class="button-row"><button id="programme-up-${id}" class="secondary-button" aria-label="Move ${segment(id).name} earlier" ${i === 0 ? 'disabled' : ''}>Earlier</button><button id="programme-down-${id}" class="secondary-button" aria-label="Move ${segment(id).name} later" ${i === order.length - 1 ? 'disabled' : ''}>Later</button><button id="programme-remove-${id}" class="secondary-button" aria-label="Remove ${segment(id).name}">Remove</button></div></li>`).join('')}</ol>${!order.length ? '<p>Choose a proposal above to start your order.</p>' : ''}<p id="programme-message" class="grid-message">${[message, issue || (same ? 'Your posted programme matches this draft.' : 'Everyone has a place. This draft is ready to post.')].filter(Boolean).join(' ')}</p><p class="footnote">A rhythm workshop before the stories needs a quiet interval between them. Art can go anywhere. You can also begin with the stories. Editing a draft keeps the last posted programme and the neighbors’ responses until you post again.</p><div class="button-row">${button('programme-publish', published.length ? 'Post this revision ↗' : 'Post our programme ↗', true, !!issue || same)}${published.length ? button('programme-view', 'See the posted programme') : ''}${button('programme-close', 'Keep this draft & return')}</div>${published.length ? `<p>Posted: ${programmeTitle(published)}. ${same ? 'The draft matches.' : 'You have an unposted draft.'}</p>` : '<p>No programme is posted yet. Your first gathering remains complete.</p>'}`);
  modalReturnTarget = $('#next-afternoon');
  for (const item of SEGMENTS) {
    bind(`programme-add-${item.id}`, () => { act({ type: 'programme-add', id: item.id }); programmeEditor(`${item.name} added.`, `programme-remove-${item.id}`); });
    bind(`programme-remove-${item.id}`, () => { act({ type: 'programme-remove', id: item.id }); programmeEditor(`${item.name} removed from the draft.`, `programme-add-${item.id}`); });
    for (const [direction, delta] of [['up', -1], ['down', 1]]) bind(`programme-${direction}-${item.id}`, () => {
      act({ type: 'programme-move', id: item.id, direction: delta });
      const index = state.programme.order.indexOf(item.id), canRepeat = direction === 'up' ? index > 0 : index < state.programme.order.length - 1;
      programmeEditor(`${item.name} is now ${index + 1} of ${state.programme.order.length}.`, `programme-${canRepeat ? direction : direction === 'up' ? 'down' : 'up'}-${item.id}`);
    });
  }
  bind('programme-publish', () => { act({ type: 'programme-publish' }); programmePoster(); });
  bind('programme-view', programmePoster); bind('programme-close', () => close($('#next-afternoon')));
  if (focusId) { const target = document.getElementById(focusId); target?.focus({ preventScroll: true }); modal.scrollTop = scroll; target?.scrollIntoView({ block: 'nearest' }); }
}
function programmePoster() {
  const { published, order } = state.programme, svg = programmeSVG(published);
  if (!svg) return programmeEditor();
  show(`<span class="eyebrow">OUR POSTED PROGRAMME · FICTIONAL FUTURE GATHERING</span><h2 id="modal-title">${programmeTitle(published)}</h2><img class="programme-poster" alt="Original programme poster. The same running order is listed below." src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}"><ol id="posted-programme">${published.map(id => `<li>${segment(id).name} · proposed by ${segment(id).owner}</li>`).join('')}</ol><p>No real festival, date or performance is announced. ${state.hosting.order.length ? "This is a future plan. The gathering you began keeps its own running order, shown on the portable board. Revisions here do not rewrite it." : "This poster is ready to host as a fictional second afternoon. The portable board beside the mural shows this order."} Your optional soundtrack remains yours to choose.</p><div class="programme-response"><h3>The neighbors answer</h3>${['bea', 'dez', 'celeste', 'thanh'].map(id => `<p><strong>${NEIGHBORS.find(n => n.id === id).name}:</strong> ${programmeResponse(id, published)}</p>`).join('')}</div><p>${JSON.stringify(order) === JSON.stringify(published) ? 'Your draft matches this poster. You can still revise it.' : 'You have an unposted draft. This poster keeps the last programme everyone agreed on.'}</p><div class="button-row">${button('programme-edit', 'Revise the running order', true)}${button('programme-host', state.hosting.order.length ? 'Visit our second gathering' : 'Host the programme')}${button('programme-poster-close', 'Back to the block')}</div><p class="footnote">Original abstract art, no photos or real musician likenesses. Separate from your gathering keepsake and from real history in Field notes.</p>`);
  bind('programme-edit', () => programmeEditor('', 'programme-order-heading'));
  bind('programme-host', () => hostingScreen());
  modalReturnTarget = $('#next-afternoon');
  $('#modal-title').setAttribute('tabindex', '-1'); $('#modal-title').focus({ preventScroll: true });
  bind('programme-poster-close', () => close($('#next-afternoon')));
}
function showGatheringPlan() {
  const scene = gatheringScene(state), svg = gatheringPlanSVG(scene);
  const previousTool = activeTool, editorMessage = body.querySelector('.grid-message')?.textContent;
  show(`<span class="eyebrow">THE SPACE YOU MADE TOGETHER</span><h2 id="modal-title">${scene.title}</h2><p>${scene.caption}</p><img class="gathering-plan" alt="Current gathering plan. The striped third row stays clear; supply positions are described below." src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}"><p class="plan-route">Through-route: the striped third row stays clear.</p><ul class="plan-supplies">${scene.items.map(item => `<li>${item.label}: ${item.cells.map(p => `column ${p.col + 1}, row ${p.row + 1}`).join(' and ')}.</li>`).join('') || (scene.phase === 'packing' ? '<li>No table, seats or speaker remain in this plan.</li>' : '<li>No supplies placed yet.</li>')}</ul><p class="footnote">${state.hosting.order.length ? "Your opening-chapter supply plan; the second gathering has its own activity and new stools/panel. " : ""}A schematic of your first fictional event, not a street survey or a group keepsake. The original map distances stay the same. Visitors ${scene.phase === 'open' ? scene.layout === 'table' ? 'gather for conversation by the table.' : 'make room for movement at the edges.' : scene.phase === 'packing' ? 'have finished this gathering.' : 'join after the gathering opens.'} The scene works with sound off; Reduce ambient motion in Settings stills the movement.</p><div class="button-row">${button('gathering-plan-close', state.opened ? 'Back to the block' : 'Back to arranging', true)}</div>`);
  bind('gathering-plan-close', () => {
    if (state.opened) return close();
    activeTool = previousTool; layoutEditor(editorMessage || 'Choose a supply, then choose a space. You can move it again.');
    $('#preview-layout').focus({ preventScroll: true });
  });
}
function photoConsent() {
  if (!state.opened || state.epilogue.packing) return;
  if (state.epilogue.photo.status === 'taken') return viewKeepsake();
  show(`<span class="eyebrow">AN OPTIONAL KEEPSAKE</span><h2 id="modal-title">Ask before the picture.</h2><p>One illustrated memory of the afternoon? Everyone gets a say. Choose among the neighbors who said yes; Rook’s answer is respected.</p><div class="consent-list">${PHOTO_RESPONSES.map(person => person.agrees ? `<label class="consent-row"><input type="checkbox" id="photo-${person.id}" value="${person.id}" checked><span><strong>${person.name}</strong><small>${person.response}</small></span></label>` : `<div class="consent-row declined"><span class="consent-decline">—</span><span><strong>${person.name} · not pictured</strong><small>${person.response}</small></span></div>`).join('')}</div><p class="footnote">This creates original artwork of fictional characters. It does not use a camera, capture the map, or upload anything. It keeps a snapshot of your current mural and layout.</p><p id="photo-message" role="status"></p><div class="button-row">${button('take-keepsake', 'Make this keepsake ↗', true)}${button('skip-keepsake', 'Keep it as a story')}${button('photo-later', 'Decide later')}</div>`);
  bind('take-keepsake', () => {
    const participants = PHOTO_GUESTS.filter(id => $(`#photo-${id}`).checked);
    if (!participants.length) { $('#photo-message').textContent = 'Choose at least one neighbor who said yes, or keep the afternoon as a story.'; return; }
    act({ type: 'photo', participants }); viewKeepsake();
  });
  bind('skip-keepsake', () => { act({ type: 'skip-photo' }); close(); toast('An afternoon can be remembered without a picture. Everyone still has a place.'); });
  bind('photo-later', close);
}
function viewKeepsake() {
  const photo = state.epilogue.photo, svg = postcardSVG(photo);
  if (!svg) return;
  const names = PHOTO_GUESTS.filter(id => photo.participants.includes(id)).map(id => NEIGHBORS.find(n => n.id === id).name).join(', ');
  const data = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  show(`<span class="eyebrow">YOUR AFTERNOON, KEPT</span><h2 id="modal-title">A little room to remember.</h2><img class="keepsake-image" src="${data}" alt="Original illustrated keepsake with ${names}, your saved mural, and the ${photo.layout === 'table' ? 'Long Table' : 'Open Floor'} memory. Rook is not pictured."><p>${names} ${photo.participants.length === 1 ? 'said' : 'all said'} yes. Rook chose to stay out of the picture. Everyone remains part of the afternoon.</p><p class="footnote">This is original artwork of fictional characters, not a real photograph. Your keepsake stays as it was, even if you change the mural later.</p><div class="button-row"><a id="download-keepsake" class="primary-button download-link" href="${data}" download="tenderloin-redux-afternoon.svg">Save the illustration ↗</a>${button('keepsake-close', 'Back to the block')}</div>`);
  bind('keepsake-close', close);
}
function packingChoice() {
  if (!state.opened || state.epilogue.packing) return;
  show(`<span class="eyebrow">WHENEVER YOU’RE READY</span><h2 id="modal-title">An afternoon winds down.</h2><p>“I’ll fold the seats,” says Bea. “Would you bring the table to Thanh, the paint case to Celeste, and the speaker to Rook?”</p><p>You can still explore afterward. This ends the active gathering. ${state.epilogue.photo.status === 'taken' ? 'Your illustrated keepsake is already saved in your field notes.' : 'If you want an illustrated keepsake, make it before packing; you can also leave the afternoon as a story.'}</p><div class="button-row">${button('confirm-pack', 'Let’s pack up together ↗', true)}${button('pack-later', 'Stay a little longer')}</div>`);
  bind('confirm-pack', () => { act({ type: 'pack' }); close(); toast('Bea folds the seats. Return the three borrowed supplies in any order, or take a walk first.'); }); bind('pack-later', close);
}
function returnLoan(loan) {
  if (!state.opened || !state.epilogue.packing || state.epilogue.returned.includes(loan.id)) return;
  const replies = { table: '“Thanks for bringing it back. It’s seen a lot of afternoons like this. Let’s give it another one soon.”', 'paint-case': '“Still plenty of paint for next time. Keep the panel up a little longer; I like what we made.”', speaker: '“Cable coiled, speaker back. Good crew today. Next time I’ll tell you about the show where the power went out.”' };
  show(`${characterHeader(loan.owner)}<p>${replies[loan.id]}</p><p>You return ${loan.label}. The gathering is already complete; this is a chance to say thanks.</p><div class="button-row">${button('return-event-loan', 'Return the borrowed supply ↗', true)}${button('return-later', 'Catch you in a bit')}</div>`);
  bind('return-event-loan', () => { act({ type: 'return-loan', id: loan.id }); close(); toast(state.epilogue.returned.length === LOANS.length ? 'All three loans are back. The neighbors are ready for another afternoon.' : 'Returned with thanks. You can keep exploring.'); }); bind('return-later', close);
}

function welcome() {
  const returning = state.greeted || state.litter.length || Object.keys(state.mural).length;
  show(`<div class="welcome-art" aria-hidden="true"><span></span><span></span><span></span><span></span></div><span class="eyebrow">WELCOME TO YOUR AFTERNOON</span><h2 id="modal-title">A little care.<br>A whole block.</h2><p>Bea has a table. Celeste has paint. Rook knows his way around a sound system. The neighbors are putting a gathering together, and you’re helping co-host.</p><p>Take a walk, hear their ideas, and make room for something good. There’s no timer.</p><div class="button-row">${button('begin', returning ? 'Continue your afternoon ↗' : 'Step onto the block ↗', true)}</div><div class="dialog-controls"><span><kbd>WASD</kbd> or arrows to walk</span><span><kbd>E</kbd> to talk / help</span></div><p class="footnote">Tap people or objects, choose a preparation, or use Meet the neighbors to walk over. Use + / − to zoom, drag to look around, and Follow me to find yourself. A fictional gathering on real street centerlines; scenery is an early approximation. Music is optional.</p>`);
  bind('begin', () => { close(); if (savedMessage) toast(savedMessage); else toast('Bea is just ahead. Tap her, or choose Meet the neighbors.'); });
}
function layoutChoice() {
  act({ type: 'greet' });
  if (state.epilogue.packing) { show(`${characterHeader('bea')}<p>“Seats are folded. I’m leaving a little room for whoever stops to say goodbye.”</p><p>Today’s ${state.layout === 'table' ? 'Long Table' : 'Open Floor'} is a memory now. We kept the other idea for another afternoon.</p><div class="button-row">${button('back-block', 'Back to the block', true)}</div>`); bind('back-block', close); return; }
  if (state.opened) { show(`${characterHeader('bea')}<p>“There’s a place for everyone. I’m keeping a seat for whoever wanders over next.”</p><p>Today’s ${state.layout === 'table' ? 'Long Table' : 'Open Floor'} is all set. We kept the other idea in our notes for another afternoon.</p><div class="button-row">${button('back-block', 'Back to the gathering', true)}</div>`); bind('back-block', close); return; }
  show(`${characterHeader('bea')}<p>“We’ve been wanting an afternoon like this. I’m bringing the table; Dez and Celeste have a different idea for the space. What do you think?”</p><div class="choice-cards"><button id="choose-table" class="choice-card ${state.layout === 'table' ? 'selected' : ''}"><div class="layout-preview"><i></i><i></i></div><strong>Long Table</strong><small>Bea’s idea: seats, stories, and room to linger.</small></button><button id="choose-floor" class="choice-card ${state.layout === 'floor' ? 'selected' : ''}"><div class="layout-preview open"><i></i><i></i><i></i></div><strong>Open Floor</strong><small>Dez & Celeste’s idea: a little room for music and art.</small></button></div><p class="footnote">Everyone is welcome in either layout. The other idea goes into your field notes for another time. You can change your mind before opening.</p>`);
  for (const value of ['table', 'floor']) bind(`choose-${value}`, () => { act({ type: 'layout', value }); layoutEditor(); });
}
function layoutEditor(message = null) {
  if (!state.layout || state.opened) return layoutChoice();
  if (message === null) { activeTool = FURNITURE.find(id => !state.furniture[id]) || activeTool; message = 'Choose a supply, then choose a space. You can move it again.'; }
  const cells = [];
  for (let row = 0; row < 5; row++) for (let col = 0; col < 8; col++) {
    const item = Object.entries(state.furniture).find(([id, pos]) => occupiedCells(id, pos, state.layout).some(cell => cell.row === row && cell.col === col));
    const route = row === 2;
    cells.push(`<button id="cell-${col}-${row}" class="grid-cell ${route ? 'route' : ''} ${item ? `occupied ${item[0]}` : ''}" data-col="${col}" data-row="${row}" aria-label="Column ${col + 1}, row ${row + 1}: ${route ? 'clear route, keep free' : item ? item[0] : 'empty'}" ${state.opened ? 'disabled' : ''}>${route ? (col === 0 ? '→' : col === 7 ? '→' : '·') : item ? ({ table: 'Table', seats: 'Seats', speaker: 'Sound' }[item[0]]) : '+'}</button>`);
  }
  show(`<span class="eyebrow">MAKE ROOM FOR EVERYONE</span><h2 id="modal-title">${state.layout === 'table' ? 'The Long Table' : 'An Open Floor'}</h2><p>Arrange the borrowed supplies inside the fictional gathering space. Keep the striped route clear from one end to the other.</p><div class="tool-picker">${FURNITURE.map(id => `<button id="tool-${id}" aria-pressed="${activeTool === id}">${({ table: '▰ Table', seats: '▥ Seats', speaker: '▣ Speaker' }[id])}${state.furniture[id] ? ' ✓' : ''}</button>`).join('')}</div><div class="placement-grid" aria-label="Gathering arrangement, 8 columns by 5 rows">${cells.join('')}</div><div class="grid-legend"><i></i> Clear route · supplies need two spaces · each layout welcomes everyone</div><p class="grid-message" role="status">${message}</p><div class="button-row">${button('change-plan', 'Hear both ideas again')}${button('preview-layout', 'Preview your arrangement ↗')}${button('layout-done', progress(state).layout ? 'Looks good. Back to the block ↗' : 'Keep this arrangement ↗', true)}</div><p class="footnote">The grid is a play abstraction, not a measured accessibility assessment.</p>`);
  for (const id of FURNITURE) bind(`tool-${id}`, () => { activeTool = id; layoutEditor(`Placing ${id}. Choose an empty pair of spaces away from the clear route.`); });
  body.querySelectorAll('.grid-cell').forEach(cell => cell.addEventListener('click', () => {
    const col = Number(cell.dataset.col), row = Number(cell.dataset.row);
    if (!canPlaceFurniture(state, activeTool, col, row)) { layoutEditor('That spot would overlap a supply, the clear route, or the edge. Try another pair of spaces.'); return; }
    act({ type: 'furniture', id: activeTool, col, row });
    const next = FURNITURE.find(id => !state.furniture[id]); if (next) activeTool = next;
    layoutEditor(progress(state).layout ? '✓ Everyone has room, and the route stays clear. Rook can check the speaker next.' : 'That fits. Place the next supply, or move this one.');
  }));
  bind('change-plan', layoutChoice); bind('layout-done', close);
  bind('preview-layout', showGatheringPlan);
}
function muralEditor(message = null) {
  if (message === null) { activeMotif = MOTIFS.find(id => !state.mural[id]) || activeMotif; message = 'Choose a neighbor’s idea, then a space on the portable panel.'; }
  const cells = [];
  for (let row = 0; row < 3; row++) for (let col = 0; col < 6; col++) {
    const item = Object.entries(state.mural).find(([, p]) => p.col === col && p.row === row);
    cells.push(`<button id="mcell-${col}-${row}" class="grid-cell" data-col="${col}" data-row="${row}" style="color:${item ? PALETTE_COLORS[state.palette][MOTIFS.indexOf(item[0])] : '#b79e77'}" aria-label="Panel column ${col + 1}, row ${row + 1}: ${item ? item[0] : 'empty'}">${item ? SIGNS[item[0]] : '·'}</button>`);
  }
  const labels = { sun: 'Lulu’s sun', wave: 'Dez’s rhythm', rise: 'Celeste’s letters' };
  show(`<span class="eyebrow">ART WITH THE NEIGHBORS</span><h2 id="modal-title">Many hands. One mural.</h2><p>“Lulu brought a sun, Dez brought a rhythm, and I brought some letters,” says Celeste. “Let’s see what they look like together.”</p><div class="tool-picker">${MOTIFS.map(id => `<button id="motif-${id}" aria-pressed="${activeMotif === id}">${labels[id]}${state.mural[id] ? ' ✓' : ''}</button>`).join('')}</div><div class="placement-grid mural-grid" aria-label="Portable mural panel, 6 columns by 3 rows">${cells.join('')}</div><div class="palette">Palette ${PALETTES.map(id => `<button id="palette-${id}" class="swatch ${state.palette === id ? 'selected' : ''}" style="background:${PALETTE_COLORS[id][0]}" aria-label="${id} palette" aria-pressed="${state.palette === id}"></button>`).join('')}</div><p class="grid-message" role="status">${message}</p><div class="button-row">${button('mural-done', progress(state).mural ? 'Our panel is ready ↗' : 'Keep working later ↗', true)}</div><p class="footnote">Original motifs on a fictional, permissioned portable panel. Existing public art stays untouched.</p>`);
  MOTIFS.forEach(id => bind(`motif-${id}`, () => { activeMotif = id; muralEditor(`Place ${labels[id].toLowerCase()} anywhere on the panel. Move it as often as you like.`); }));
  PALETTES.forEach(id => bind(`palette-${id}`, () => { act({ type: 'palette', value: id }); muralEditor('A new palette, the same shared ideas.'); }));
  body.querySelectorAll('.grid-cell').forEach(cell => cell.addEventListener('click', () => {
    const col = Number(cell.dataset.col), row = Number(cell.dataset.row);
    if (Object.entries(state.mural).some(([id, p]) => id !== activeMotif && p.col === col && p.row === row)) { muralEditor('Another neighbor’s idea is there. Choose a free space, or move that idea first.'); return; }
    act({ type: 'mural', id: activeMotif, col, row }); const next = MOTIFS.find(id => !state.mural[id]); if (next) activeMotif = next;
    muralEditor(progress(state).mural ? '✓ The whole neighborhood has a hand in this one. You can still rearrange it.' : 'That looks good. Add another neighbor’s idea.');
  })); bind('mural-done', close);
}
function tidy(item) {
  if (state.litter.includes(item.id)) return;
  show(`<span class="eyebrow">A LITTLE TIDYING</span><h2 id="modal-title">${item.label}</h2><p>Bea pointed out this discarded litter before setting up. You check that it isn’t something a neighbor is using, then put it in the gathering’s cleanup bag.</p><div class="button-row">${button('collect-litter', 'Pick it up ↗', true)}${button('leave-litter', 'Come back later')}</div><p class="footnote">Only the three marked litter objects can be collected. Nobody’s belongings are cleanup targets.</p>`);
  bind('collect-litter', () => { act({ type: 'tidy', id: item.id }); close(); toast(progress(state).tidy ? 'A little tidier. Bea has already set out the cleanup bag for the next gathering.' : 'One small thing taken care of.'); }); bind('leave-litter', close);
}
function talk(id) {
  const pendingLoan = LOANS.find(loan => loan.owner === id && state.epilogue.packing && !state.epilogue.returned.includes(loan.id));
  if (pendingLoan) return returnLoan(pendingLoan);
  if (state.epilogue.packing && LOANS.some(loan => loan.owner === id && state.epilogue.returned.includes(loan.id))) {
    show(`${characterHeader(id)}<p>${({ thanh: '“Table’s back and I’ve got a new tune in mind. That was a good afternoon.”', celeste: '“Paint’s packed. The panel stays. Take another look whenever you like.”', rook: '“Speaker’s home. Good crew today. Next time, I’ll bring another story.”' }[id])}</p><div class="button-row">${button('return-chat-close', 'See you around ↗', true)}</div>`); bind('return-chat-close', close); return;
  }
  if (id === 'bea') return layoutChoice();
  if (id === 'celeste') {
    const comment = state.opened ? state.layout === 'table' ? '“Someone reads the panel, then brings a story back to the table. The letters have started a conversation of their own.”' : '“Dez said nobody had to make a big thing of dancing. So I tried a little step. Turns out the room we left matters.”' : '“I’ve been making signs for ages, but it still feels good when somebody stops to look. For this panel, I want everyone to have a hand in it.”';
    show(`${characterHeader(id)}<p>${comment}</p><p>${state.opened ? 'The shared panel is finished, and there is still room to try another arrangement of its original shapes.' : 'She has already prepared the panel and mixed the colors. Lulu and Dez have contributed shapes. You can help arrange them.'}</p><div class="button-row">${button('start-mural', state.opened ? 'Look at our mural ↗' : 'Compose the mural ↗', true)}${button('talk-close', state.opened ? 'Enjoy the afternoon' : 'Catch you in a bit')}</div>`);
    bind('start-mural', () => muralEditor()); bind('talk-close', close); return;
  }
  if (id === 'rook') {
    const layoutReady = progress(state).layout;
    show(`${characterHeader(id)}<p>${state.soundcheck ? '“There we go. A little less gain, a little more room to hear each other.”' : '“I used to work sound. These days I’m between places, but my ears are still good. Let’s get the speaker facing the gathering.”'}</p><p>${!layoutReady ? '“Bea’s waiting on the layout. Set out the table, seats, and speaker first, then I’ll check the sound.”' : state.soundcheck ? 'Rook has the speaker ready. The captions and visual progress stay available with the music off.' : 'Rook spots the feedback before you do, turns the speaker away from the microphone, and sets a comfortable level. He gives you a thumbs-up.'}</p><div class="button-row">${button('soundcheck', state.soundcheck ? 'Back to the block' : layoutReady ? 'Ready when you are, Rook ↗' : 'Let’s arrange the supplies ↗', true)}</div><p class="footnote">Sound is optional. This task works with your speakers muted.</p>`);
    bind('soundcheck', () => { if (!layoutReady) { close(); goTo(NEIGHBORS[0]); } else { if (!state.soundcheck) act({ type: 'soundcheck' }); close(); toast('Rook has the sound ready. “We make a pretty good crew.”'); } }); return;
  }
  if (id === 'dez') {
    const comment = state.epilogue.packing ? '“That was a good rhythm we found. I’m taking it into the next beat I make.”' : state.opened ? state.layout === 'floor' ? '“Celeste found her feet out there. See? A little open space goes a long way.”' : '“Stories sound good over a quiet beat. Bea’s table turned out pretty nice.”' : state.layout === 'floor' ? '“Thanks for leaving an open floor. Celeste said she might dance if nobody makes a big deal of it.”' : '“I’m into the long table too. I’ll bring a quiet beat so people can hear their stories.”';
    show(`${characterHeader(id)}<p>“I make beats out of things I hear walking around. A gate closing. A bus kneeling. Bea laughing three doors down.”</p><p>${comment}</p><div class="button-row">${button('dez-panel', 'See Dez’s mural idea', true)}${button('talk-close', state.epilogue.packing ? 'See you around' : state.opened ? 'Stay awhile' : 'See you at the gathering')}</div>`);
    bind('dez-panel', () => { close(); goTo(PLACES.find(p => p.id === 'mural')); }); bind('talk-close', close); return;
  }
  if (id === 'thanh') {
    show(`${characterHeader(id)}<p>${state.opened ? state.layout === 'table' ? '“That table has heard a few good stories today. Bring it back when everyone’s ready. No hurry.”' : '“Turn the table end-on, and suddenly there’s room for a little shuffle. We’ll put it to another use next time.”' : '“The folding table’s already over there. You can borrow it as long as you promise to bring it back after everyone’s had their say.”'}</p><p>${state.opened ? '“I used to play trumpet. Being here with everyone makes me think I might pick it up again.”' : '“I’ve also got a little surprise for the end. Nothing fancy. You’ll hear.”'}</p><div class="button-row">${button('talk-close', 'Thanks, Thanh ↗', true)}</div><p class="footnote">Thanh is a fictional resident. The prototype’s sound is an original synthesized sketch.</p>`); bind('talk-close', close);
  }
}
function history() {
  act({ type: 'history' });
  show(`<span class="eyebrow">FIELD NOTE 01 · REAL PLACE</span><h2 id="modal-title">A corner that remembers.</h2><p>The northwest corner of Turk and Taylor is the site of Compton’s Cafeteria, associated with the 1966 uprising by transgender people and other patrons resisting police harassment.</p><p>This is living history in the Transgender District. Our fictional gathering takes place along the neighboring block face, away from this entrance.</p><p class="footnote">The building’s later use has been publicly contested. This prototype does not reproduce a present-day business, current plaque, or exact facade.</p><div class="history-entry"><span class="eyebrow">CHECK THE SOURCE</span><p>San Francisco Historic Preservation Commission agenda, March 18, 2026: 101–121 Taylor, northwest corner of Turk and Taylor.</p><a href="https://sfplanning.org/sites/default/files/agendas/2026-03/20260318_hpc%20(ID%201559597).pdf" target="_blank" rel="noreferrer">Read the city’s document ↗</a></div><div class="button-row">${button('history-close', 'Keep this in my field notes ↗', true)}</div>`); bind('history-close', close);
}
function blackhawk() {
  act({ type: 'discover-blackhawk' });
  show(`<span class="eyebrow">FIELD NOTE 02 · REAL PLACE</span><h2 id="modal-title">A room full of sound.</h2><p>At Turk and Hyde, the Black Hawk was a meeting place for jazz. SFJAZZ documents performances here by Billie Holiday, John Coltrane and Miles Davis, among many others. The club closed in 1963.</p><p>Miles Davis’s official catalog dates the recording of his Friday-night Black Hawk live album to April 1961. A neighborhood room could hold music that traveled far beyond it.</p><p class="footnote">This reading point marks the intersection area. The former club is not operating in this scene; today’s site use, entrance and appearance have not been verified. The scenery is original and schematic. No historic recording or musician likeness is reproduced.</p><div class="history-entry"><span class="eyebrow">FOLLOW THE SOURCES · CHECKED OCTOBER 18, 2026</span><p><a href="https://www.sfjazz.org/athome/jazz-minute/history-of-the-black-hawk/" target="_blank" rel="noreferrer">SFJAZZ: History of the Black Hawk ↗</a></p><p><a href="https://www.milesdavis.com/albums/friday-night-miles-davis-in-person-at-the-blackhawk-san-francisco/" target="_blank" rel="noreferrer">Miles Davis: official album catalog ↗</a></p><p>Tenderloin Museum identifies the former club as 200 Hyde at Turk. Its archived Blackhawk Block Party took place August 13, 2022 at Dodge Place, Turk and Larkin, farther west—not at this stop. That past festival is not a current event in our game.</p><a href="https://www.tenderloinmuseum.org/public-programs-2022-1/2022/7/23/blackhawkblockparty" target="_blank" rel="noreferrer">Museum: 2022 block-party archive ↗</a></div><p>A thought to bring back: what makes a small gathering worth remembering?</p><div class="button-row">${button('blackhawk-close', 'Keep this in my field notes ↗', true)}${button('blackhawk-return', 'Walk back to Bea')}${button('blackhawk-notes', 'History walk & notes')}</div>`);
  bind('blackhawk-close', close); bind('blackhawk-return', () => goTo(NEIGHBORS[0])); bind('blackhawk-notes', historyWalk);
}
function historyWalk() {
  if (!world) { toast('The street scene is still loading.'); return; }
  show(`<span class="eyebrow">AN OPTIONAL WALK · NO HURRY</span><h2 id="modal-title">Two corners, many stories.</h2><p>Follow Turk west from Taylor, through Jones and Leavenworth, to Hyde. The intersections stay about 440 metres apart from end to end. Follow me keeps you close; Stop walking cancels the route; choose a stop again to continue. The gathering can wait.</p><ol class="history-route"><li><h3>Turk & Taylor · Compton’s corner</h3><p>A history of transgender resistance and community. ${state.history ? 'Kept in your field notes.' : 'An optional reading stop beside the gathering.'}</p>${button('walk-comptons', 'Walk to the Compton’s history stop')}${state.history ? button('read-comptons', 'Read saved note') : ''}</li><li><h3>Turk & Hyde · the former Black Hawk</h3><p>Three blocks west: Jones → Leavenworth → Hyde. ${state.blackhawk ? 'Kept in your field notes.' : 'Discover a room in the neighborhood’s jazz history.'}</p>${button('walk-blackhawk', 'Walk to the Black Hawk stop')}${state.blackhawk ? button('read-blackhawk', 'Read saved note') : ''}</li></ol><p class="footnote">Real street centerlines; schematic scenery and walking corridor. This is a bounded game route, not real-world accessibility or crossing guidance. The history stops do not gate preparations or the ending.</p><div class="button-row">${button('walk-return', 'Walk back to Bea')}${button('walk-map', 'Show the whole route')}${button('walk-close', 'Keep exploring')}</div>`);
  bind('walk-comptons', () => goTo(PLACES.find(p => p.id === 'history'))); bind('read-comptons', history);
  bind('walk-blackhawk', () => goTo(BLACK_HAWK)); bind('read-blackhawk', blackhawk);
  bind('walk-return', () => goTo(NEIGHBORS[0])); bind('walk-close', close);
  bind('walk-map', () => { const walking = walkPath.length > 0; stopWalk(); close(); world.camera.overview(true); cameraUI(); if (walking) toast('Stopped walking. Choose a history stop to start a new route.'); });
}
function journal() {
  const programme = state.opened ? `<div class="history-entry"><span class="eyebrow">OUR NEXT AFTERNOON · FICTIONAL PLAN</span><h3>${programmeTitle(state.programme.published)}</h3><p>Arrange stories, rhythm, shared art and a quiet interval with the neighbors. ${state.programme.published.length ? 'The posted order and their responses are remembered.' : 'Your first gathering is complete. This next project is here whenever you want it.'}</p>${button('journal-programme', state.programme.published.length ? 'Revisit our next afternoon' : 'Plan another afternoon')}${state.programme.published.length || state.hosting.order.length ? button('journal-host', state.hosting.order.length ? 'Our second gathering' : 'Host the posted programme') : ''}</div>` : '';
  const keepsake = state.opened ? `<div class="history-entry"><span class="eyebrow">THE AFTERNOON AFTERWARD · OPTIONAL</span><h3>${state.epilogue.photo.status === 'taken' ? 'An illustrated keepsake' : 'An afternoon can be a story'}</h3><p>${state.epilogue.photo.status === 'taken' ? 'Your chosen neighbors and the mural are kept as they were. Rook chose not to be pictured; his choice is respected.' : 'A picture is optional. The gathering is complete either way.'}</p>${state.epilogue.photo.status === 'taken' ? button('journal-keepsake', 'View your keepsake') : ''}<p>${state.epilogue.packing ? `${state.epilogue.returned.length} of 3 borrowed event supplies returned. Your gathering remains complete.` : 'When you are ready, the optional packing-up choice is below the map.'}</p></div>` : '';
  show(`<span class="eyebrow">YOUR FIELD NOTES</span><h2 id="modal-title">An afternoon to remember.</h2><div class="history-entry"><span class="eyebrow">OUR GATHERING · FICTIONAL</span><h3>${state.layout === 'table' ? 'The Long Table' : state.layout === 'floor' ? 'An Open Floor' : 'Still taking shape'}</h3><p>${state.layout ? `You chose ${state.layout === 'table' ? 'Bea’s conversation-centered Long Table' : 'Dez and Celeste’s art-and-music-centered Open Floor'}. The other idea is saved as a possibility for another afternoon.` : 'Bea, Celeste, Dez, Rook, and Thanh have already started organizing. Stop by and hear their ideas.'}</p><p>${state.epilogue.packing ? 'The gathering has wound down. You can still explore, talk, and revisit the mural.' : state.opened ? 'The gathering is open. Everyone has a place. You can keep exploring, talking, and rearranging the mural.' : 'The preparations list remembers your contributions. You can take your time.'}</p></div>${keepsake}${programme}<div class="history-entry"><span class="eyebrow">REAL PLACE · DATED HISTORY</span><h3>The Compton’s corner</h3><p>${state.history ? 'You discovered the historic site at Turk and Taylor. It is part of a neighborhood with a long history of transgender resistance and community.' : 'There’s a history stop on the northwest side of Turk and Taylor. Take a walk over when you feel like it.'}</p>${button('journal-history', state.history ? 'Read the history note' : 'Walk to the history stop')}</div><div class="history-entry"><span class="eyebrow">WHAT’S REAL, WHAT’S IMAGINED</span><p>Street centerlines: OpenStreetMap data. Neighbors, gathering, litter, portable mural, and borrowed supplies: fictional. Buildings, sidewalks, trees, crosswalks, and bike-lane widths: schematic, awaiting current visual verification.</p>${button('journal-district', 'The living Transgender District')} ${button('journal-walk', 'Explore the Turk history walk')} ${button('journal-map', 'Map & source notes')}</div>`);
  if (voicesHost.enabled) { body.insertAdjacentHTML('beforeend', `<div class="history-entry"><span class="eyebrow">EXPERIMENTAL · OPTIONAL</span><h3>Neighborhood Voices</h3><p>Three dated organization introductions, separate from our fictional neighbors and projects.</p>${button('journal-voices', 'Open Neighborhood Voices')}</div>`); bind('journal-voices', openVoices); }
  bind('journal-history', () => { if (state.history) history(); else { close(); goTo(PLACES.find(p => p.id === 'history')); } }); bind('journal-map', mapInfo); bind('journal-district', livingDistrict); bind('journal-walk', historyWalk);
  if (civicAvailable(state)) { body.insertAdjacentHTML('beforeend', `<div class="history-entry"><span class="eyebrow">A LATER AFTERNOON · FICTIONAL CIVIC EVENT</span><h3>A tenant listening hour</h3><p>Neighbors bring different priorities about repairs, staying put and shared-space access. ${state.civic.phase === 'done' ? 'Your agreed setup and their responses are remembered.' : 'The conversation can wait for you.'}</p>${button('journal-civic', state.civic.phase === 'done' ? 'Remember our listening hour' : 'Visit the listening hour')}</div>`); bind('journal-civic', () => civicScreen()); }
  if (filmAvailable(state)) { body.insertAdjacentHTML('beforeend', `<div class="history-entry"><span class="eyebrow">A LATER DAY · FICTIONAL FILM PROJECT</span><h3>The Open Seat</h3><p>An original three-shot illustrated short, made around neighbors’ permission, quiet and access.</p>${button('journal-film', state.film.phase === 'done' ? 'Screen our little film' : 'Visit our little film project')}</div>`); bind('journal-film', () => filmScreen()); }
  bind('journal-programme', () => programmeEditor());
  bind('journal-host', () => hostingScreen());
  bind('journal-keepsake', viewKeepsake);
}
function districtUI() {
  const visible = !!world?.districtVisible;
  $('#district-legend').hidden = !visible;
  const toggle = $('#district-layer');
  if (!toggle) return;
  toggle.disabled = districtStatus !== 'ready';
  toggle.textContent = visible ? 'Hide the city boundary' : 'Show the city boundary';
  $('#district-state').textContent = districtStatus === 'ready' ? 'City boundary ready. It extends beyond the game’s walkable area.' : districtStatus === 'error' ? 'The city layer could not load. You can keep playing and try again.' : 'Loading the local city boundary…';
  const retry = $('#district-retry');
  if (districtStatus !== 'error' && document.activeElement === retry) $('#modal-title').focus({ preventScroll: true });
  retry.hidden = districtStatus !== 'error';
}
async function requestDistrict() {
  if (!world || districtStatus === 'ready') { districtUI(); return; }
  if (!districtPromise) {
    districtStatus = 'loading';
    districtPromise = (async () => {
      const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch('./data/transgender-district.geojson', { signal: controller.signal });
        if (!response.ok) throw Error('City data unavailable');
        world.districtPolygons = districtGeometry(await response.json()); districtStatus = 'ready';
      } catch { districtStatus = 'error'; }
      finally { clearTimeout(timeout); districtPromise = null; }
    })();
  }
  districtUI(); await districtPromise; districtUI();
}
function livingDistrict() {
  if (!world) { toast('The street scene is still loading.'); return; }
  show(`<span class="eyebrow">LIVING CULTURE · REAL COMMUNITY</span><h2 id="modal-title" tabindex="-1">More than a line on a map.</h2><p>The Transgender District describes its work as sustaining transgender history, culture and economic opportunity in the southeastern Tenderloin. Honey Mahogany, Janetta Johnson and Aria Sa’id founded the organization in 2017.</p><p>Its community reaches beyond the small area you can walk here. A city boundary records a designation; it does not decide who belongs or where transgender people live.</p><div class="history-entry"><h3>A city map, with its limits</h3><p>The dashed violet line and light tint show the city-published cultural-district polygon, using the same geographic projection as our streets. Only part fits inside this game. It does not mark surveyed doors, crosswalks, murals, or a permission to hold an event.</p><p id="district-state" role="status">Loading the local city boundary…</p><div class="button-row">${button('district-layer', 'Show the city boundary', true, districtStatus !== 'ready')}<button id="district-retry" class="secondary-button" ${districtStatus === 'error' ? '' : 'hidden'}>Try the layer again</button></div></div><div class="history-entry"><h3>Streets change, too</h3><p>SFMTA reported the Turk protected bikeway between Mason and Polk in April 2018. Its Safer Taylor project page reports substantial completion in 2024, including wider sidewalks and crossing changes. These dated records do not verify today’s paint, poles, doorways or crossing condition. Our street widths and decorations remain schematic.</p><p><a href="https://www.sfmta.com/blog/turk-street-gets-new-protected-bike-lane" target="_blank" rel="noreferrer">SFMTA: Turk, April 2018 ↗</a> · <a href="https://www.sfmta.com/projects/safer-taylor-street" target="_blank" rel="noreferrer">SFMTA: Safer Taylor ↗</a></p></div><div class="history-entry"><span class="eyebrow">PRIMARY SOURCES · CHECKED OCTOBER 18, 2026</span><p><a href="https://transgenderdistrictsf.com/about" target="_blank" rel="noreferrer">The Transgender District: about its community and work ↗</a></p><p><a href="https://data.sf.gov/d/5xmc-5bjj" target="_blank" rel="noreferrer">DataSF: Cultural Districts ↗</a> · <a href="./data/transgender-district.geojson" target="_blank">Download the city feature ↗</a> · <a href="./data/cultural-district-source.json" target="_blank">Provenance & PDDL license ↗</a></p><p><a href="https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_admin/0-0-0-59534" target="_blank" rel="noreferrer">City code, §107.3(d): designation description ↗</a></p><p class="footnote">Boundary data: San Francisco Planning Department, DataSF, PDDL. Street data: OpenStreetMap contributors, ODbL. No logos, photos or source artwork reproduced; no organizational partnership is implied.</p></div><div class="button-row">${button('district-close', 'Back to exploring ↗', true)}</div>`);
  bind('district-layer', () => { if (districtStatus !== 'ready') return; world.districtVisible = !world.districtVisible; districtUI(); close(world.districtVisible ? canvas : $('#district-button')); toast(world.districtVisible ? 'City cultural-district boundary shown. The legend has source notes and a Hide control.' : 'City boundary hidden.'); });
  bind('district-close', close); bind('district-retry', requestDistrict);
  districtUI(); if (districtStatus === 'idle' || districtStatus === 'loading') requestDistrict();
  (districtStatus === 'ready' ? $('#district-layer') : districtStatus === 'error' ? $('#district-retry') : $('#modal-title')).focus({ preventScroll: true });
}
function mapInfo() {
  show(`<span class="eyebrow">A REAL CORNER, CAREFULLY DRAWN</span><h2 id="modal-title">Turk: Taylor to Hyde.</h2><p>The streets use actual OpenStreetMap centerline coordinates, projected at one uniform scale and rotated so Turk runs across the screen. The block lengths and relative intersections are retained.</p><p>The optional history walk follows Turk west through Jones and Leavenworth to Hyde, about 440 metres from Taylor. This is a first playable, not a surveyed recreation. Facades, doorways, sidewalk widths, trees, crossing designs, bike-lane dimensions, and gathering permissions still need local visual checks. The portable decorations belong to our fictional event.</p><div class="history-entry"><span class="eyebrow">MAP DATA · ODbL 1.0</span><p>© OpenStreetMap contributors. API extract downloaded October 18, 2026. The data remains available separately under the Open Database License, independently of the game’s MIT-licensed code and original graphics.</p><p><a href="./data/streets.osm.json" target="_blank">Street geometry & provenance ↗</a> · <a href="./data/source-turk-west.osm.xml" target="_blank">Turk-west OSM extract ↗</a> · <a href="./data/source.osm.xml" target="_blank">Earlier opening-block extract ↗</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">License & attribution ↗</a></p></div><div class="button-row">${button('map-close', 'Back to our corner ↗', true)}</div>`); bind('map-close', close);
}
function finale() {
  if (!ready(state)) { toast('There are a few preparations left. Check the list beside the map.'); return; }
  const wasOpen = state.opened; if (!wasOpen) act({ type: 'open' });
  if (state.epilogue.packing) {
    show(`<span class="success-stamp">AN AFTERNOON WELL SPENT</span><h2 id="modal-title">The good things stay.</h2><p>The gathering has wound down. ${state.epilogue.returned.length === LOANS.length ? 'The three loans are home with their neighbors.' : 'The neighbors are packing up together; you can return the remaining loans whenever you like.'}</p><p>You can still explore, talk, discover the corner’s history, or revisit the mural. Your gathering remains complete.</p><div class="button-row">${button('stay-block', 'Back to the block ↗', true)}${button('finale-notes', 'Open your field notes')}</div>`); bind('stay-block', close); bind('finale-notes', journal); return;
  }
  show(`<span class="success-stamp">THE BLOCK IS OPEN</span><h2 id="modal-title">You made a little room.</h2><p>${state.layout === 'table' ? 'The long table fills with conversation. Bea leaves an extra chair at the end, and Dez keeps the rhythm easy enough to hear each other.' : 'The open floor fills with movement. Dez taps out a rhythm, Celeste starts a small dance, and Bea finds a seat with a good view.'}</p><p>Rook has the sound just right. The neighbor-made panel catches the afternoon light. Thanh smiles when the trumpet part comes in.</p><p>It’s one afternoon. The neighborhood’s bigger stories continue. For now, there’s room to be together.</p><div class="button-row">${button('stay-block', 'Stay a little longer ↗', true)}${button('finale-notes', 'Remember this afternoon')}</div><p class="footnote">First playable complete. You can keep walking, meet the other neighbors, discover the history stop, and revisit the mural. Your progress is saved on this device.</p>`);
  bind('stay-block', close); bind('finale-notes', journal);
}
function showSettings() {
  show(`<span class="eyebrow">MAKE YOURSELF COMFORTABLE</span><h2 id="modal-title">Your afternoon.</h2><label class="settings-row" for="volume"><span>Music volume <span id="volume-number">${Math.round(settings.volume * 100)}%</span></span><input id="volume" type="range" min="0" max="80" value="${settings.volume * 100}"></label><label class="settings-row" for="motion"><span>Reduce ambient motion</span><input type="checkbox" id="motion" ${settings.reducedMotion ? 'checked' : ''}></label><p>Music is optional. Every preparation, conversation, and completion message works without sound.</p><fieldset class="experiment-settings"><legend>Experimental</legend><label class="settings-row" for="voices-enabled"><span>Neighborhood Voices · text only</span><input id="voices-enabled" type="checkbox" ${settings.experimental.neighborhoodVoices ? 'checked' : ''}></label><p>Three dated organization cards with official links. Off by default. You can turn this off at any time; your gathering stays the same. No TenderVoice code, recordings or interviews are included.</p><p id="voices-settings-status" role="status"></p></fieldset><div class="history-entry"><span class="eyebrow">YOUR SAVED AFTERNOON</span><p>${recovery ? 'An unreadable save has been preserved. Use this new afternoon only if you want to replace it.' : storageAvailable ? 'Your progress stays in this browser on this device.' : 'Browser storage is unavailable. Progress will last in this tab.'}</p>${recovery ? button('recover-save', 'Use this new afternoon') : ''}<button id="restart" class="danger-button">Start a new afternoon…</button></div>`);
  $('#volume').addEventListener('input', event => { settings.volume = Number(event.target.value) / 100; music.setVolume(settings.volume); $('#volume-number').textContent = `${Math.round(settings.volume * 100)}%`; saveSettings(); });
  $('#motion').addEventListener('change', event => { settings.reducedMotion = event.target.checked; document.documentElement.classList.toggle('reduced-motion', settings.reducedMotion); saveSettings(); });
  $('#voices-enabled').addEventListener('change', event => setVoicesEnabled(event.target.checked)); voicesUI();
  bind('recover-save', () => { recovery = false; persist(); toast('This afternoon is now saved.'); showSettings(); });
  bind('restart', () => { show(`<span class="eyebrow">A FRESH START</span><h2 id="modal-title">Another afternoon?</h2><p>This replaces this browser’s current gathering, layout, mural, and history discoveries. Your sound, motion and experiment settings stay as they are.</p><div class="button-row">${button('confirm-restart', 'Start fresh', true)}${button('cancel-restart', 'Keep my afternoon')}</div>`); bind('confirm-restart', () => { state = initialState(); recovery = false; stopWalk(); if (world) { world.camera.overview(); if (world.width < 600) world.camera.follow(state.player); cameraUI(); } updateUI(); persist(); close(); toast('A fresh afternoon. Bea is ready when you are.'); }); bind('cancel-restart', showSettings); });
}
function interact(object) {
  if (!object) return;
  if (NEIGHBORS.some(n => n.id === object.id)) return talk(object.id);
  if (LITTER.some(n => n.id === object.id)) return tidy(LITTER.find(n => n.id === object.id));
  if (object.id === 'layout') return state.greeted ? layoutEditor() : layoutChoice();
  if (object.id === 'mural') return muralEditor();
  if (object.id === 'history') return history();
  if (object.id === 'blackhawk') return blackhawk();
}
function goTo(object) {
  if (!world) { toast('The street scene is still loading. Try again when the map is ready.'); return; }
  if (Math.hypot(state.player.x - object.x, state.player.y - object.y) < 35) { stopWalk(); world.camera.follow(state.player); cameraUI(); interact(object); return; }
  const path = findPath(state.player, object, ways);
  if (!path.length) { closeIfOpen(); toast('A route to that stop is unavailable in this scene. Try a nearby neighbor.'); return; }
  walkPath = path; world.path = path; walkTarget = object; world.camera.follow(state.player); cameraUI(); hint(); toast(`Walking to ${object.name || object.label}. Choose Stop walking to cancel.`); closeIfOpen(); canvas.focus({ preventScroll: true });
}
function stopWalk() { walkPath = []; walkTarget = null; if (world) { world.path = []; hint(); } }
function closeIfOpen() { if (modal.open) close(); }
function neighbors() {
  if (!world) { toast('The street scene is still loading.'); return; }
  show(`<span class="eyebrow">A FEW FAMILIAR FACES</span><h2 id="modal-title">Meet the neighbors</h2><p>Choose someone and walk over to talk. You can stop along the way. These are fictional neighbors on a real street map.</p><ul class="neighbor-directory">${NEIGHBORS.map(n => `<li><button class="secondary-button" id="neighbor-${n.id}" aria-label="Walk to ${n.name}. ${n.role}"><span class="portrait" style="background:${n.coat}55" aria-hidden="true">${n.name[0]}</span><span class="neighbor-description"><strong>${n.name}</strong><small>${n.role}</small></span><span class="walk-label">Walk over ↗</span></button></li>`).join('')}</ul>${button('neighbors-close', 'Keep exploring')}`);
  for (const n of NEIGHBORS) bind(`neighbor-${n.id}`, () => goTo(n));
  bind('neighbors-close', close);
}
function cameraUI() {
  if (!world) return;
  const c = world.camera;
  const focused = document.activeElement;
  $('#zoom-out').disabled = c.scale <= c.minimum + .001;
  $('#zoom-in').disabled = c.scale >= c.maximum - .001;
  if (focused === $('#zoom-in') && focused.disabled) $('#zoom-out').focus({ preventScroll: true });
  if (focused === $('#zoom-out') && focused.disabled) $('#zoom-in').focus({ preventScroll: true });
  $('#recenter').setAttribute('aria-pressed', String(c.following));
  $('#camera-status').textContent = c.overviewMode ? c.routeOverview ? 'Turk history walk' : 'Full block' : c.following ? 'Following you' : 'Looking around';
}
function moveTo(point) {
  const path = findPath(state.player, point, ways);
  if (!path.length) { toast('Keep to the streets and sidewalks. Click a neighbor to find a route over.'); return; }
  walkPath = path; world.path = path; walkTarget = null; world.camera.follow(state.player); cameraUI(); hint();
}
function hint() {
  const nearest = world.nearest(), text = walkPath.length ? `Walking${walkTarget ? ` to ${walkTarget.name || walkTarget.label}` : ''}…` : nearest ? NEIGHBORS.some(n => n.id === nearest.id) ? `Talk with ${nearest.name}` : nearest.name : 'Explore the block';
  $('#world-prompt span').textContent = text; $('#world-prompt kbd').textContent = walkPath.length ? '↑↓←→' : 'E';
  $('#stop-walking').disabled = !walkPath.length;
  const status = walkPath.length ? `${text} Choose Stop walking to cancel.` : nearest ? `Nearby: ${nearest.name}. Use Talk / help or choose a neighbor.` : 'Choose a neighbor for a walking route.';
  if ($('#route-status').textContent !== status) $('#route-status').textContent = status;
}
function renderFrame(ms) {
  const delta = Math.min((ms - lastFrame) / 1000 || 0, .045); lastFrame = ms;
  let moving = false;
  if (!modal.open) {
    let dx = 0, dy = 0;
    if (keys.has('arrowleft') || keys.has('a')) dx--;
    if (keys.has('arrowright') || keys.has('d')) dx++;
    if (keys.has('arrowup') || keys.has('w')) dy--;
    if (keys.has('arrowdown') || keys.has('s')) dy++;
    if (dx || dy) {
      if (walkPath.length) stopWalk();
      const length = Math.hypot(dx, dy), speed = 150 * delta;
      const x = state.player.x + dx / length * speed, y = state.player.y + dy / length * speed;
      if (walkable({ x, y: state.player.y }, ways)) state.player.x = x;
      if (walkable({ x: state.player.x, y }, ways)) state.player.y = y;
      moving = true; moved = true;
    } else if (walkPath.length) {
      const next = walkPath[0], distance = Math.hypot(next.x - state.player.x, next.y - state.player.y), speed = 160 * delta;
      if (distance <= speed + .1) { state.player = { x: next.x, y: next.y }; walkPath.shift(); }
      else { state.player.x += (next.x - state.player.x) / distance * speed; state.player.y += (next.y - state.player.y) / distance * speed; }
      moving = true; moved = true;
      if (!walkPath.length) { hint(); if (walkTarget) { const target = walkTarget; walkTarget = null; interact(target); } }
    }
  }
  world.motion = moving; world.draw(ms / 1000, settings.reducedMotion);
  if (ms - lastHint > 150) { hint(); lastHint = ms; }
  if (moved && ms - lastSave > 1500) { persist(); moved = false; lastSave = ms; }
  requestAnimationFrame(frame);
}
function frame(ms) {
  try { renderFrame(ms); }
  catch (error) {
    keys.clear(); persist(); console.error(error);
    show('<span class="eyebrow">A PAUSE ON THE BLOCK</span><h2 id="modal-title">The scene needs a reload.</h2><p>Your saved preparations are kept. Reload to return to this afternoon. A current browser with Canvas support is required.</p><div class="button-row"><button id="reload-scene" class="primary-button">Reload the scene</button></div>');
    bind('reload-scene', () => location.reload());
  }
}

$('#close-modal').addEventListener('click', () => close(returnFocus()));
bind('voices-button', openVoices);
modal.addEventListener('close', () => { keys.clear(); if (!modal.open) { voicesHost.dismiss(); focusReturn(); modalReturnTarget = canvas; } });
window.addEventListener('keydown', event => {
  if (modal.open || !world) return;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable) return;
  const key = event.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) { event.preventDefault(); keys.add(key); }
  if ((key === 'e' || key === 'enter') && !event.repeat && !['BUTTON', 'A'].includes(document.activeElement?.tagName)) { event.preventDefault(); const nearest = world.nearest(); if (nearest) { stopWalk(); interact(nearest); } else toast('Walk a little closer to a neighbor or a marked object.'); }
});
window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());
window.addEventListener('pagehide', () => { persist(); music.stop(); if (modal.open && body.querySelector('[data-neighborhood-voices]')) close($('#voices-button')); voicesHost.suspend(); });
window.addEventListener('pageshow', event => { if (event.persisted) voicesHost.resume(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { keys.clear(); persist(); music.stop(); voicesHost.silence(); } });
$('#journal-button').addEventListener('click', journal); $('#settings-button').addEventListener('click', showSettings);
$('#map-info').addEventListener('click', mapInfo); $('#about-button').addEventListener('click', mapInfo);
$('#open-gathering').addEventListener('click', finale);
$('#world-prompt').addEventListener('click', () => { if (!world) return; if (walkPath.length) { canvas.focus({ preventScroll: true }); toast('Walking to your stop. Choose Stop walking to cancel.'); return; } const nearest = world.nearest(); if (nearest) { stopWalk(); interact(nearest); } else { toast('Walk a little closer, or choose a neighbor from the list.'); canvas.focus({ preventScroll: true }); } });
$('#recenter').addEventListener('click', () => { if (world) { world.camera.follow(state.player); cameraUI(); } });
$('#map-overview').addEventListener('click', () => { if (world) { world.camera.overview(); cameraUI(); } });
for (const [id, factor] of [['zoom-in', 1.35], ['zoom-out', 1 / 1.35]]) $( `#${id}`).addEventListener('click', () => { if (world) { world.camera.zoom(factor); cameraUI(); } });
$('#neighbors-button').addEventListener('click', neighbors);
$('#history-walk-button').addEventListener('click', historyWalk);
$('#district-button').addEventListener('click', livingDistrict); $('#district-notes').addEventListener('click', livingDistrict);
$('#district-hide').addEventListener('click', () => { if (!world) return; world.districtVisible = false; districtUI(); $('#district-button').focus({ preventScroll: true }); toast('City boundary hidden.'); });
$('#stop-walking').addEventListener('click', () => { stopWalk(); canvas.focus({ preventScroll: true }); toast('Stopped here. Choose a neighbor whenever you’re ready.'); });
$('#sound-toggle').addEventListener('click', toggleMusic);
$('#music-button').addEventListener('click', showMusic);
async function init() {
  try {
    const response = await fetch('./data/streets.osm.json'); if (!response.ok) throw Error(`Street data: HTTP ${response.status}`);
    const data = await response.json(); ways = makeWays(data);
    if (!walkable(state.player, ways)) state.player = initialState().player;
    world = new World(canvas, ways, () => state, { click: (point, object) => object ? goTo(object) : moveTo(point), camera: cameraUI, reducedMotion: settings.reducedMotion });
    cameraUI();
    updateUI(); if (recovery) $('#save-status').textContent = 'An unreadable save is preserved. See Settings for recovery.';
    welcome(); $('#loading').remove(); requestAnimationFrame(frame);
    // Read-only inspection for diagnostics; no production bypass for quest actions.
    window.tenderloin = Object.freeze({ snapshot: () => structuredClone(state), location: () => ({ ...world.offset, scale: world.scale }), sound: () => ({ mode: music.fileName ? 'local' : 'sketch', enabled: music.enabled, starting: music.starting, fileName: music.fileName, volume: music.volume, position: music.position, error: music.error }), experiment: () => voicesHost.snapshot(), version: '0.12.0' });
  } catch (error) {
    let loading = $('#loading'); if (!loading) { loading = document.createElement('div'); loading.id = 'loading'; loading.className = 'loading'; $('.world-panel').append(loading); }
    loading.innerHTML = '<div class="error-box"><strong>This corner could not load.</strong><p>Run the local server with <code>npm run dev</code>, then open its printed address. If the server is running, try again.</p><button class="secondary-button" id="retry-load">Try again</button></div>';
    bind('retry-load', () => location.reload()); console.error(error);
  }
}
voicesHost.setEnabled(settings.experimental.neighborhoodVoices);
init();
