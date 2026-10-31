// One pointer activation, one effect: the 2D port of Godot's press settle (godot/main.gd settle_swallows, arm_press_settle).
export const PRESS_SETTLE_MS = 450;
export const PRESS_SETTLE_RADIUS = 32;
export const PRESS_SETTLE_RADIUS_TOUCH = 36;
export const PRESS_SETTLE_MAX_FRAME_MS = 50;
export const PRESS_SETTLE_EVENTS = ['pointerdown', 'pointerup', 'pointercancel', 'click'];
// Godot arms every BaseButton, toggles and links included. A label arms for the checkbox or radio it forwards its click to.
const CONTROL = 'button, input[type=button], input[type=submit], input[type=reset], input[type=checkbox], input[type=radio], summary, a[href], [role=button], [role=link], [role=checkbox], [role=radio], [role=switch], [role=tab], [role=menuitem]';

export function createPressSettle({ windowMs = PRESS_SETTLE_MS, radius = PRESS_SETTLE_RADIUS, touchRadius = PRESS_SETTLE_RADIUS_TOUCH, maxFrameMs = PRESS_SETTLE_MAX_FRAME_MS } = {}) {
  let clock = 0, last = null, until = 0, at = { x: 0, y: 0 }, reach = 0, armedId = '', rapid = false, pending = null, armed = 0, swallowed = 0;
  const gestures = new Map();
  const inside = e => clock < until && Math.hypot(e.x - at.x, e.y - at.y) < reach;
  const repeats = hit => {
    if (!rapid || !armedId) return false;
    const h = typeof hit === 'function' ? hit() : hit;
    return !!h && h.id === armedId && !!h.rapid && !!h.enabled && !!h.connected;
  };
  const decide = (e, hit, press) => {
    if (!inside(e)) { if (press) until = 0; return false; }
    if (repeats(hit)) return false;
    swallowed++; return true;
  };
  return {
    tick(now) {
      if (Number.isFinite(now)) { if (last !== null) clock += Math.min(Math.max(0, now - last), maxFrameMs); last = now; }
      return clock;
    },
    // claim: the release just handled was the press, so the click that follows it is swallowed too.
    arm({ x, y, pointerType, id, rapid: isRapid = false, detail, windowMs: ms = windowMs, claim = false } = {}) {
      if (detail === 0 || !(ms > 0) || !Number.isFinite(x) || !Number.isFinite(y)) return false;
      until = clock + ms; at = { x, y }; reach = pointerType === 'touch' || pointerType === 'pen' ? touchRadius : radius;
      armedId = id ? String(id) : ''; rapid = !!isRapid; armed++;
      if (claim) pending = { verdict: true, at: clock, claimed: true };
      return true;
    },
    swallow(event = {}, hit) {
      const { type = 'pointerdown', pointerId = 0, button = 0, detail } = event;
      if (button > 0) return false;
      if (type === 'click') {
        if (detail === 0) return false;
        // A click takes the verdict of the release it follows within two capped frames; any other click is judged as a press.
        const made = pending; pending = null;
        if (!made || clock - made.at > 2 * maxFrameMs) return decide(event, hit, true);
        if (made.claimed) swallowed++;
        return made.verdict;
      }
      if (type === 'pointercancel') { const verdict = gestures.get(pointerId) === true; gestures.delete(pointerId); return verdict; }
      if (type === 'pointerup') {
        const verdict = gestures.has(pointerId) ? gestures.get(pointerId) : decide(event, hit, false);
        gestures.delete(pointerId); pending = { verdict, at: clock }; return verdict;
      }
      const verdict = decide(event, hit, true);
      gestures.set(pointerId, verdict); return verdict;
    },
    get counters() { return { armed, swallowed, open: clock < until }; },
  };
}

export function installPressSettle(doc, win = doc.defaultView, options = {}) {
  const core = createPressSettle(options);
  const now = () => win.performance?.now?.() ?? Date.now();
  const schedule = win.requestAnimationFrame ? callback => win.requestAnimationFrame(callback) : callback => win.setTimeout(() => callback(now()), 16);
  const unschedule = win.cancelAnimationFrame ? id => win.cancelAnimationFrame(id) : id => win.clearTimeout(id);
  let live = true, lastType = 'mouse', relay = null, frame = schedule(function loop(time) { if (!live) return; core.tick(time); frame = schedule(loop); });
  const settleMs = () => { const value = win.__tenderloinPressSettleMs; return typeof value === 'number' ? Math.max(0, value) : undefined; };
  const controlOf = node => node?.closest?.(CONTROL) ?? null;
  const rapidOf = node => { const mark = node?.closest?.('[data-rapid]'); return !!mark && mark.getAttribute?.('data-rapid') !== 'false'; };
  const enabled = node => !node.disabled && node.getAttribute?.('aria-disabled') !== 'true';
  const hitAt = (x, y) => () => { const node = controlOf(doc.elementFromPoint?.(x, y)); return node && { id: node.id || '', rapid: rapidOf(node), enabled: enabled(node), connected: !!node.isConnected }; };
  const describe = event => ({ type: event.type, x: event.clientX, y: event.clientY, pointerType: event.pointerType || lastType, pointerId: event.pointerId ?? 0, button: event.button ?? 0, detail: event.detail });
  const listener = event => {
    if (event.type !== 'click' && event.pointerType) lastType = event.pointerType;
    if (event.type === 'pointerdown') relay = null;
    else if (event.type === 'click' && relay) { const forwarded = event.target === relay; relay = null; if (forwarded) return; }
    const e = describe(event);
    if (core.swallow(e, hitAt(e.x, e.y))) { event.stopImmediatePropagation(); event.preventDefault(); return; }
    if (event.type !== 'click' || !(event.detail > 0)) return;
    const own = controlOf(event.target), label = own ? null : event.target?.closest?.('label');
    const node = own ?? (label?.control?.matches?.(CONTROL) ? label.control : null);
    if (!node || !enabled(node)) return;
    core.arm({ ...e, id: node.id, rapid: rapidOf(node), windowMs: settleMs() });
    relay = label ? node : null; // the label's own forwarded click on its control is this press, not a second one
  };
  for (const type of PRESS_SETTLE_EVENTS) doc.addEventListener(type, listener, true);
  // Godot's buttons ignore echo key events, so a held Enter presses once. Blink clicks the focused control on every repeated
  // Enter, and the first press often moves focus to the next dialog's default button. This rule is not the press window.
  const keys = event => { if (event.key === 'Enter' && event.repeat && controlOf(event.target)) event.preventDefault(); };
  doc.addEventListener('keydown', keys, true);
  const exposed = {};
  for (const key of ['armed', 'swallowed', 'open']) Object.defineProperty(exposed, key, { enumerable: true, get: () => core.counters[key] });
  win.__tenderloinPressSettle = exposed;
  return {
    snapshot: () => core.counters,
    // Godot arms only Buttons; its world taps never arm. A 2D canvas tap can open a dialog under the finger, so the page calls
    // tap(event) from the canvas pointerup once the tap is handled, and it arms only when something new now covers that point.
    // That tap's own click is claimed: Blink sends a touch click to whatever is under the finger after touchend.
    tap(event) {
      if (!live || !event || event.button > 0) return false;
      if (event.pointerType) lastType = event.pointerType;
      const x = event.clientX, y = event.clientY, over = doc.elementFromPoint?.(x, y);
      if (!over || !event.target?.contains || event.target.contains(over)) return false;
      return core.arm({ x, y, pointerType: event.pointerType || lastType, windowMs: settleMs(), claim: true });
    },
    dispose() {
      if (!live) return;
      live = false; unschedule(frame);
      for (const type of PRESS_SETTLE_EVENTS) doc.removeEventListener(type, listener, true);
      doc.removeEventListener('keydown', keys, true);
      if (win.__tenderloinPressSettle === exposed) delete win.__tenderloinPressSettle;
    },
  };
}
