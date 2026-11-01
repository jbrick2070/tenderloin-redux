// Dez's Rhythm Circle as a dialog: the DOM side of rhythm.js (pure). Godot draws eight lanterns in the street and a tray of
// pads and options; the fork draws the lanterns inside the dialog and keeps every Godot control except View Circle, which
// frames the 3D visitors (RHYTHM_WEB_OVERRIDES drops its sentence). Practice lives only in this module's session: it is never
// saved and is gone on reload. Hosting mode edits through core.js host-beat / host-complete, which save as Godot does.
//
// host = {
//   doc, win, modal, getState(), show(html), close(targetId), status(text), toast(text), act(action),
//   music,                        the Soundtrack (enabled, starting, fileName, sketch: SketchPlayer)
//   volume(), unlocked(),         the music volume 0-1 and Godot's reward_audio_unlocked (the first real press)
//   toggleMusic(),                Godot toggle_music_playback
//   receipt(),                    Godot save_receipt in the fork's words, read after the write it reports
//   objective(), sparks(),        the current objective text and spark_count
//   stopWalk(), lastChapter(),    stop the street walk first; true when the current chapter is the story's last
//   afterClose(origin, text, notice),   return to where the circle was opened from ('hosting' or 'block') with an
//                                 announcement; notice is Godot's chapter_completion_notice for the next chapter card
// }
// No Rhythm Circle button is marked rapid in Godot, so press-settle.js guards every one of them.
import { RHYTHM_TEXT, BAR_FRAMES, RATE, barSamples, circleAvailable, circlePattern, closedSession, openCircle, closeCircle, toggleStep, listen, complete, afterComplete, heading, objectiveLine, readerText, pads, options, playBarGate, auditionMustStop, activeStep, lamps } from './rhythm.js';

const esc = text => String(text).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
const label = text => esc(text).replace(/\n/g, '<br>');
const STYLE = `
.rhythm{display:grid;gap:10px;min-width:0}
.rhythm-credit,.rhythm-objective{font-size:.8rem;margin:0}
.rhythm-lamps{display:block;width:100%;height:auto;max-height:90px}
.rhythm-reader{max-height:30vh;overflow:auto;padding:6px 8px;border-radius:8px}
.rhythm-reader p{margin:.35em 0}
.rhythm-pads,.rhythm-options{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
.rhythm-pads button,.rhythm-options button{min-height:44px;min-width:44px;white-space:normal;overflow-wrap:anywhere;padding:6px 4px}
@media (max-width:360px){.rhythm-options{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;

export function createRhythm(host) {
  const { doc, win, modal } = host;
  let session = closedSession(), origin = 'block', audition = null, frame = 0, open = false;
  if (!doc.getElementById('rhythm-style')) { const style = doc.createElement('style'); style.id = 'rhythm-style'; style.textContent = STYLE; doc.head.append(style); }
  const $ = id => doc.getElementById(id);
  const state = () => host.getState();
  const bind = (id, fn) => $(id)?.addEventListener('click', fn);
  const musicPlaying = () => !!(host.music.enabled || host.music.starting);
  const mode = () => host.music.fileName ? 'local' : 'sketch';
  const auditioning = () => !!audition;
  const pattern = () => circlePattern(state(), session);
  // A redraw that waits (for the music to start, for a bar to end) only while the circle still holds the dialog: Back or × may
  // have closed it, or another screen, such as the recovery offer, may have replaced it in the same dialog.
  const onScreen = () => open && modal.open && modal.contains($('rhythm-reader'));

  function lampSVG(step) {
    const ls = lamps(pattern(), step);
    return `<svg class="rhythm-lamps" viewBox="0 0 400 70" role="img" aria-label="${esc(ls.map(l => `${l.step + 1} ${l.hit ? RHYTHM_TEXT.hit : RHYTHM_TEXT.rest}`).join(', '))}"><rect width="400" height="70" rx="10" fill="#172c32"/>${ls.map(l => `<circle data-lamp="${l.step}" cx="${25 + l.step * 50}" cy="35" r="${(12 * l.scale).toFixed(1)}" fill="${l.color}" stroke="#c29e66" stroke-width="1"/>`).join('')}</svg>`;
  }
  function render(focusId = null) {
    const opts = options(session, { musicPlaying: musicPlaying(), auditioning: auditioning() });
    const text = readerText(session.message, { mode: mode(), localName: host.music.fileName });
    host.show(`<section class="rhythm" data-rhythm><p class="eyebrow rhythm-credit">${esc(RHYTHM_TEXT.credit)}</p><h2 id="modal-title" tabindex="-1">${esc(heading(session))}</h2><p class="rhythm-objective">${esc(objectiveLine(host.objective(), host.sparks()))}</p><figure id="rhythm-figure" style="margin:0">${lampSVG(currentStep())}</figure><div id="rhythm-reader" class="rhythm-reader" tabindex="0" role="region" aria-label="Rhythm Circle text">${text.split('\n').map(line => `<p>${esc(line)}</p>`).join('')}</div><div class="rhythm-pads" role="group" aria-label="Eight steps">${pads(pattern()).map(p => `<button id="rhythm-pad-${p.step}" class="secondary-button" aria-pressed="${p.hit}" aria-label="${esc(p.name)}">${label(p.label)}</button>`).join('')}</div><div class="rhythm-options">${opts.map(o => `<button id="rhythm-${o.id}" class="secondary-button"${o.name ? ` aria-label="${esc(o.name)}"` : ''}>${label(o.label)}</button>`).join('')}</div></section>`);
    for (let i = 0; i < 8; i++) bind(`rhythm-pad-${i}`, () => edit(toggleStep(state(), session, i), `rhythm-pad-${i}`));
    bind('rhythm-listen', () => edit(listen(state(), session), 'rhythm-listen'));
    bind('rhythm-music', async () => { await host.toggleMusic(); if (onScreen()) render('rhythm-music'); });
    bind('rhythm-complete', finish);
    bind('rhythm-step-cues', () => { session = { ...session, stepCues: !session.stepCues }; render('rhythm-step-cues'); });
    bind('rhythm-back', () => leave(true));
    bind('rhythm-play-bar', playBar);
    if (focusId) $(focusId)?.focus({ preventScroll: true });
    loop();
  }
  // Godot builds the message once host_toggle_beat has saved: the step as the save now holds it, and that write's receipt. An act()
  // may close the circle (sync), and one that returns false did not happen (a newer save took it back): it adds no message, so
  // the rebase's own notice stands.
  function edit(out, focusId) {
    stopAudition(false);
    const applied = out.actions.map(action => host.act(action)).every(Boolean);
    if (!onScreen()) return;
    if (applied) session = out.done(state(), host.receipt());
    render(focusId);
    if (applied) host.status(session.message);
  }
  function finish() {
    stopAudition(false);
    const before = state(), out = complete(before, session);
    if (!out.close) { session = out.session; render('rhythm-complete'); return; }
    for (const action of out.actions) host.act(action);
    const after = afterComplete(state(), { lastChapter: host.lastChapter() });
    session = closedSession(); open = false; stopLoop();
    host.afterClose(origin, after.announce, after.notice);
  }
  function leave(announce) {
    if (!open) return;
    stopAudition(false);
    const out = closeCircle(session, { receipt: host.receipt() });
    session = out.session; open = false; stopLoop();
    host.afterClose(origin, announce ? out.announce : '');
  }

  // --- Play Bar: one drum bar at the music volume while the sketch is muted (Godot -80 dB), then the sketch returns. ---
  function playBar() {
    const gate = playBarGate({ auditioning: auditioning(), unlocked: host.unlocked(), musicPlaying: musicPlaying(), volume: host.volume(), mode: mode(), pattern: pattern() });
    if (gate.stop) stopAudition(false);
    else if (gate.start && !startBar()) return;
    session = { ...session, message: gate.message };
    render('rhythm-play-bar');
    host.status(gate.message);
  }
  function startBar() {
    const ctx = host.music.sketch.ensureContext?.();
    if (!ctx) return false;
    try {
      const buffer = ctx.createBuffer(1, BAR_FRAMES, RATE);
      buffer.getChannelData(0).set(barSamples(pattern()));
      const source = ctx.createBufferSource(), gain = ctx.createGain();
      gain.gain.value = host.volume();
      source.buffer = buffer; source.connect(gain); gain.connect(ctx.destination);
      host.music.sketch.mute(true);
      const mine = { source, gain, startedAt: ctx.currentTime, ctx };
      source.onended = () => { if (audition !== mine) return; audition = null; host.music.sketch.mute(false); if (onScreen()) { session = { ...session, message: RHYTHM_TEXT.barEnded }; render(doc.activeElement?.id || null); host.status(RHYTHM_TEXT.barEnded); } };
      audition = mine; source.start();
      return true;
    } catch { audition = null; host.music.sketch.mute(false); return false; }
  }
  // Godot stop_audition: the sketch gain comes back; an open circle says so unless the caller sets its own message.
  function stopAudition(announce = true) {
    if (!audition) return;
    const a = audition; audition = null;
    try { a.source.onended = null; a.source.stop(); a.source.disconnect(); a.gain.disconnect(); } catch { /* already ended */ }
    host.music.sketch.mute(false);
    if (announce && open) { session = { ...session, message: RHYTHM_TEXT.barStoppedSettings }; render(doc.activeElement?.id || null); }
  }

  // --- Lamps: the step under the sketch clock (Step cues On) or the auditioned bar's position, redrawn in place. ---
  function currentStep() {
    const secs = audition ? audition.ctx.currentTime - audition.startedAt : null;
    return activeStep(state(), session, { musicPlaying: musicPlaying(), volume: host.volume(), mode: mode(), frames: host.music.sketch.position?.() ?? 0, queued: 0, auditionSeconds: secs });
  }
  let shown = -2;
  function tick() {
    frame = 0;
    if (!open || !modal.open || !$('rhythm-figure')) return;
    // Godot tick: an audition stops when music stops, the volume reaches 0 or a local file plays.
    if (audition && auditionMustStop({ visible: true, musicPlaying: musicPlaying(), volume: host.volume(), mode: mode() })) stopAudition(true);
    const step = currentStep();
    if (step !== shown) { shown = step; $('rhythm-figure').innerHTML = lampSVG(step); }
    if (audition || session.stepCues) frame = win.requestAnimationFrame(tick);
  }
  function loop() { shown = -2; if (!frame && (audition || session.stepCues)) frame = win.requestAnimationFrame(tick); }
  function stopLoop() { if (frame) win.cancelAnimationFrame(frame); frame = 0; }

  modal.addEventListener('cancel', event => {
    if (!open || !modal.contains($('rhythm-reader'))) return;
    event.preventDefault(); leave(true);
  });
  // × or any other close keeps nothing: practice is gone and the hosted draft is already saved.
  modal.addEventListener('close', () => { if (open) { stopAudition(false); session = closedSession(); open = false; stopLoop(); } });
  let musicKey = '';
  const musicState = () => JSON.stringify([musicPlaying(), mode(), host.music.fileName]);

  return {
    available: () => circleAvailable(state()),
    entryLabel: () => RHYTHM_TEXT.entry,
    // from: 'hosting' (the hosting dialog's beats activity) or 'block' (the afterglow entry).
    open(from = 'block', { busy = false } = {}) {
      host.stopWalk();
      const out = openCircle(state(), { busy });
      if (!out.opened) { host.toast(out.announce); return false; }
      origin = from; session = out.session; open = true;
      musicKey = musicState(); render('rhythm-pad-0');
      host.status(out.announce);
      return true;
    },
    // After every state change: Godot closes the circle when it stops being available, and redraws on music changes.
    sync() { if (!open) return; if (!circleAvailable(state())) { stopAudition(false); session = closedSession(); open = false; stopLoop(); host.afterClose(origin, ''); } },
    // Godot tick: a changed music state stops an audition that no longer applies and refreshes the labels.
    musicChanged() {
      if (!open || !modal.open || !$('rhythm-reader')) return;
      if (audition && auditionMustStop({ visible: true, musicPlaying: musicPlaying(), volume: host.volume(), mode: mode() })) { stopAudition(true); return; }
      const key = musicState(); if (key !== musicKey) { musicKey = key; render(doc.activeElement?.id || null); }
    },
    stop() { stopAudition(false); },
    get isOpen() { return open; },
    get auditioning() { return auditioning(); },
    snapshot: () => ({ open, practice: session.practice, pattern: open ? pattern() : null, stepCues: session.stepCues, auditioning: auditioning(), message: session.message }),
  };
}
