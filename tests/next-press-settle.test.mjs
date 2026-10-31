import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPressSettle, installPressSettle, PRESS_SETTLE_MS, PRESS_SETTLE_RADIUS, PRESS_SETTLE_RADIUS_TOUCH, PRESS_SETTLE_MAX_FRAME_MS, PRESS_SETTLE_EVENTS } from '../browser-next/press-settle.js';

function setup(options) {
  const guard = createPressSettle(options);
  let now = 1000; guard.tick(now);
  const wait = (ms, step = 10) => { for (let left = ms; left > 0; left -= step) guard.tick(now += Math.min(step, left)); return guard.tick(now); };
  return { guard, wait };
}
const press = (guard, x, y, hit, extra = {}) => guard.swallow({ type: 'pointerdown', x, y, pointerType: 'mouse', pointerId: 1, ...extra }, hit);
const tap = (guard, x, y, hit, pointerType = 'mouse', pointerId = 1) => ['pointerdown', 'pointerup', 'click'].map(type => guard.swallow({ type, x, y, pointerType, pointerId, detail: type === 'click' ? 1 : 0 }, hit));
const live = id => ({ id, rapid: true, enabled: true, connected: true });
const godot = path => readFileSync(new URL(`../godot/${path}`, import.meta.url), 'utf8');

test('constants and rule shapes follow Godot press settle', () => {
  const main = godot('main.gd'), checks = godot('tests/press_settle_checks.gd');
  const read = name => { const match = main.match(new RegExp(`^const ${name} := ([\\d.]+)$`, 'm')); assert.ok(match, `godot/main.gd declares const ${name}`); return Number(match[1]); };
  assert.equal(PRESS_SETTLE_MS, read('PRESS_SETTLE_MSEC'));
  assert.equal(PRESS_SETTLE_RADIUS, read('PRESS_SETTLE_RADIUS'));
  assert.equal(PRESS_SETTLE_RADIUS_TOUCH, read('PRESS_SETTLE_RADIUS_TOUCH'));
  assert.equal(PRESS_SETTLE_MAX_FRAME_MS, read('PRESS_SETTLE_MAX_FRAME_MSEC'));
  assert.ok(checks.includes(`game.PRESS_SETTLE_MSEC == ${PRESS_SETTLE_MS} and game.PRESS_SETTLE_RADIUS == ${PRESS_SETTLE_RADIUS}.0 and game.PRESS_SETTLE_RADIUS_TOUCH == ${PRESS_SETTLE_RADIUS_TOUCH}.0,"the shipped settle window is ${PRESS_SETTLE_MS} ms, ${PRESS_SETTLE_RADIUS} px mouse, ${PRESS_SETTLE_RADIUS_TOUCH} px touch")`), 'godot/tests/press_settle_checks.gd pins the same window');
  const shape = (name, lines) => {
    const start = main.indexOf(`\nfunc ${name}(`);
    assert.ok(start >= 0, `godot/main.gd defines ${name}()`);
    const body = main.slice(start + 1, main.indexOf('\nfunc ', start + 1)).split('\n');
    let i = 0;
    for (const line of lines) { i = body.indexOf(line, i); assert.ok(i >= 0, `godot/main.gd ${name}() still reads, in this order and nesting: ${line.trim()}`); i++; }
  };
  shape('_process', ['\tif press_settle_tick > 0: press_settle_clock += mini(settle_now - press_settle_tick, PRESS_SETTLE_MAX_FRAME_MSEC)']);
  shape('settle_swallows', [
    '\tif not (touch or (event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT)): return false',
    '\tif event.pressed:',
    '\t\tif (press_settle_clock < press_settle_until or frame <= press_settle_frame + 1) and event.position.distance_to(press_settle_at) < press_settle_radius:',
    '\t\t\tif not press_repeats_in_place():',
    '\t\t\t\tpress_swallowed += 1',
    '\t\t\t\treturn true',
    '\t\telse:',
    '\t\t\tpress_settle_until = 0',
    '\tpress_pointer_radius = PRESS_SETTLE_RADIUS_TOUCH if touch or event.device == InputEvent.DEVICE_ID_EMULATION else PRESS_SETTLE_RADIUS',
  ]);
  shape('press_settle_ms', ['\t\tvar value: Variant = JavaScriptBridge.eval("window.__tenderloinPressSettleMs", true)', '\t\tif value is int or value is float: return maxi(0, int(value))']);
  shape('press_is_rapid', ['\t\tif node.has_meta("rapid"): return bool(node.get_meta("rapid"))', '\treturn false']);
  shape('press_repeats_in_place', ['\tif not press_settle_rapid or press_settle_button == null: return false', '\tif armed == null or armed.disabled or not armed.is_visible_in_tree(): return false', '\treturn over == armed']);
  shape('arm_press_settle', ['\tif press_pointer_frame != frame: return', '\tif msec <= 0: return', '\tpress_settle_until = press_settle_clock + msec', '\tpress_settle_rapid = press_is_rapid(button_node)']);
  shape('press_settle_hook', ['\tif node is BaseButton:']);
  shape('_input', ['\tif settle_swallows(event):']);
});

test('the window holds for 450 ms of frame time and closes at its edge', () => {
  const { guard, wait } = setup();
  assert.equal(guard.arm({ x: 100, y: 100, pointerType: 'mouse', id: 'open-block', detail: 1 }), true);
  assert.equal(guard.counters.open, true);
  wait(449);
  assert.equal(press(guard, 100, 100), true);
  wait(1);
  assert.equal(guard.counters.open, false);
  assert.equal(press(guard, 100, 100), false);
  assert.deepEqual(guard.counters, { armed: 1, swallowed: 1, open: false });
});

test('mouse presses settle inside 32 px and touch or pen presses inside 36 px', () => {
  for (const [pointerType, reach] of [['mouse', 32], ['touch', 36], ['pen', 36]]) {
    const { guard } = setup();
    guard.arm({ x: 100, y: 100, pointerType, id: 'talk' });
    assert.equal(press(guard, 100 + reach - 0.1, 100), true, `${pointerType} just inside`);
    assert.equal(press(guard, 100, 100 - reach + 0.1), true, `${pointerType} just inside, other side`);
    const diagonal = (reach - 0.1) / Math.SQRT2;
    assert.equal(press(guard, 100 + diagonal, 100 + diagonal), true, `${pointerType} diagonal`);
    assert.equal(press(guard, 100 + reach, 100), false, `${pointerType} on the edge`);
    assert.equal(guard.counters.open, false, 'a press outside the radius ends the window');
    assert.equal(press(guard, 100, 100), false);
  }
  const { guard } = setup();
  guard.arm({ x: 100, y: 100, pointerType: 'mouse' });
  assert.equal(press(guard, 134, 100, null, { pointerType: 'touch' }), false, 'the radius is the arming pointer’s');
});

test('both halves of a tap are swallowed, even when the press is held past the window', () => {
  const { guard, wait } = setup();
  guard.arm({ x: 100, y: 100, pointerType: 'touch', id: 'choose-table' });
  wait(80);
  assert.deepEqual(tap(guard, 104, 98, null, 'touch'), [true, true, true]);
  assert.equal(guard.counters.swallowed, 1, 'one swallowed press, not three events');
  wait(60);
  assert.equal(press(guard, 100, 100), true);
  wait(2000);
  assert.equal(guard.counters.open, false);
  assert.equal(guard.swallow({ type: 'pointerup', x: 100, y: 100, pointerId: 1 }), true, 'the held press releases into nothing');
  wait(40);
  assert.equal(guard.swallow({ type: 'click', x: 100, y: 100, detail: 1 }), true, 'its click, a frame or two later, is still that press');
  assert.deepEqual(tap(guard, 100, 100), [false, false, false], 'the window is over');
  assert.equal(guard.counters.swallowed, 2);
});

test('a swallowed press does not end the window and a press elsewhere does', () => {
  const { guard, wait } = setup();
  guard.arm({ x: 100, y: 100, pointerType: 'mouse', id: 'mural-sun' });
  for (const dx of [0, 10, 20]) { wait(100); assert.deepEqual(tap(guard, 100 + dx, 100), [true, true, true]); }
  assert.equal(guard.counters.open, true);
  assert.deepEqual(tap(guard, 300, 100), [false, false, false]);
  assert.equal(guard.counters.open, false);
  assert.deepEqual(tap(guard, 100, 100), [false, false, false]);
  assert.deepEqual(guard.counters, { armed: 1, swallowed: 3, open: false });
});

test('a click with no pointer events of its own is judged as a press', () => {
  const { guard } = setup();
  guard.arm({ x: 100, y: 100, pointerType: 'mouse', id: 'open-block' });
  assert.equal(guard.swallow({ type: 'click', x: 110, y: 100, detail: 1 }), true, 'inside the window');
  assert.deepEqual(guard.counters, { armed: 1, swallowed: 1, open: true });
  assert.equal(guard.swallow({ type: 'click', x: 400, y: 100, detail: 1 }), false, 'outside it');
  assert.equal(guard.counters.open, false, 'and it ends the window like a press elsewhere');
  assert.equal(press(guard, 100, 100), false);
});

test('a click takes its own pointer’s verdict once, and the next click is judged afresh', () => {
  const { guard } = setup();
  assert.deepEqual(tap(guard, 300, 300), [false, false, false]);
  guard.arm({ x: 300, y: 300, pointerType: 'mouse', id: 'talk' });
  assert.equal(guard.swallow({ type: 'click', x: 300, y: 300, detail: 1 }), true, 'a second, pointerless click at the armed spot');
});

test('a stale pointer verdict never reaches a later unrelated click', () => {
  for (const [verdict, later] of [[true, 600], [false, 600], [true, 2 * PRESS_SETTLE_MAX_FRAME_MS + 10], [false, 2 * PRESS_SETTLE_MAX_FRAME_MS + 10]]) {
    const { guard, wait } = setup();
    guard.arm({ x: 100, y: 100, pointerType: 'mouse', id: 'talk' });
    const at = verdict ? 100 : 400;
    assert.equal(guard.swallow({ type: 'pointerdown', x: at, y: 100, pointerId: 1 }), verdict);
    assert.equal(guard.swallow({ type: 'pointerup', x: at, y: 100, pointerId: 1 }), verdict, 'no click follows this release');
    wait(later);
    guard.arm({ x: 700, y: 700, pointerType: 'mouse', id: 'open-block' });
    const [x, y] = verdict ? [100, 400] : [700, 700];
    assert.equal(guard.swallow({ type: 'click', x, y, detail: 1 }), !verdict, `a pointerless click ${verdict ? 'outside' : 'inside'} the new window ${later} ms later is judged on its own`);
  }
});

test('a press that passed keeps its verdict when released into a window another pointer opened', () => {
  const { guard } = setup();
  assert.equal(guard.swallow({ type: 'pointerdown', x: 100, y: 100, pointerType: 'touch', pointerId: 1 }), false);
  guard.arm({ x: 100, y: 100, pointerType: 'touch', id: 'talk' });
  assert.equal(guard.swallow({ type: 'pointerup', x: 100, y: 100, pointerType: 'touch', pointerId: 1 }), false);
  assert.equal(guard.swallow({ type: 'click', x: 100, y: 100, detail: 1 }), false);
  assert.equal(guard.counters.open, true, 'its release does not end the window');
  assert.equal(guard.swallow({ type: 'pointerdown', x: 100, y: 100, pointerType: 'touch', pointerId: 2 }), true);
});

test('a release the guard never saw pressed is judged in place and never ends the window', () => {
  const { guard } = setup();
  guard.arm({ x: 100, y: 100, pointerType: 'mouse', id: 'talk' });
  assert.equal(guard.swallow({ type: 'pointerup', x: 400, y: 100, pointerId: 9 }), false);
  assert.equal(guard.counters.open, true, 'only a press elsewhere ends it, as in Godot');
  assert.equal(guard.swallow({ type: 'pointerup', x: 100, y: 100, pointerId: 9 }), true, 'inside the window');
  assert.equal(guard.swallow({ type: 'click', x: 100, y: 100, detail: 1 }), true, 'and so is its click');
  assert.deepEqual(guard.counters, { armed: 1, swallowed: 1, open: true });
});

test('a rapid control repeats in place when the same id is under the pointer', () => {
  const { guard, wait } = setup();
  guard.arm({ x: 100, y: 100, pointerType: 'mouse', id: 'zoom-in', rapid: true, detail: 1 });
  wait(120);
  assert.deepEqual(tap(guard, 101, 100, live('zoom-in')), [false, false, false]);
  guard.arm({ x: 101, y: 100, pointerType: 'mouse', id: 'zoom-in', rapid: true, detail: 1 });
  let looked = 0;
  wait(120);
  assert.deepEqual(tap(guard, 101, 101, () => { looked++; return live('zoom-in'); }), [false, false, false]);
  assert.ok(looked >= 1);
  looked = 0;
  assert.deepEqual(tap(guard, 400, 100, () => { looked++; return live('zoom-in'); }), [false, false, false]);
  assert.equal(looked, 0, 'the hit is only looked up for a press inside the window');
  assert.deepEqual(guard.counters, { armed: 2, swallowed: 0, open: false });
});

test('a rapid repeat that drifts onto another id, or onto nothing, is swallowed', () => {
  for (const hit of [live('zoom-out'), null, undefined, { ...live('zoom-in'), rapid: false }, () => live('pager-next')]) {
    const { guard, wait } = setup();
    guard.arm({ x: 100, y: 100, pointerType: 'touch', id: 'zoom-in', rapid: true });
    wait(100);
    assert.deepEqual(tap(guard, 120, 100, hit, 'touch'), [true, true, true]);
  }
});

test('a disabled, disconnected or unnamed rapid control is guarded like any other', () => {
  for (const [armed, hit] of [['zoom-in', { ...live('zoom-in'), enabled: false }], ['zoom-in', { ...live('zoom-in'), connected: false }], ['', live('')], [undefined, live(undefined)]]) {
    const { guard } = setup();
    guard.arm({ x: 100, y: 100, pointerType: 'mouse', id: armed, rapid: true });
    assert.deepEqual(tap(guard, 100, 100, hit), [true, true, true]);
  }
  const { guard } = setup();
  guard.arm({ x: 100, y: 100, pointerType: 'mouse', id: 'choose-floor', rapid: false });
  assert.deepEqual(tap(guard, 100, 100, live('choose-floor')), [true, true, true], 'a non-rapid control never repeats');
});

test('keyboard activation never arms and is never gated', () => {
  const { guard } = setup();
  assert.equal(guard.arm({ x: 0, y: 0, pointerType: '', id: 'open-block', detail: 0 }), false);
  assert.deepEqual(guard.counters, { armed: 0, swallowed: 0, open: false });
  guard.arm({ x: 100, y: 100, pointerType: 'mouse', id: 'open-block', detail: 1 });
  assert.equal(guard.swallow({ type: 'click', x: 0, y: 0, pointerType: '', detail: 0 }), false);
  assert.equal(guard.swallow({ type: 'click', x: 100, y: 100, pointerType: '', detail: 0 }), false, 'even at the armed spot');
  assert.equal(guard.counters.open, true, 'a keyboard click does not end the window');
  assert.equal(press(guard, 100, 100), true);
});

test('other mouse buttons pass and leave the window open', () => {
  const { guard } = setup();
  guard.arm({ x: 100, y: 100, pointerType: 'mouse', id: 'talk' });
  assert.equal(press(guard, 100, 100, null, { button: 2 }), false);
  assert.equal(press(guard, 400, 100, null, { button: 1 }), false);
  assert.equal(guard.counters.open, true);
  assert.equal(press(guard, 100, 100), true);
});

test('slow frames advance the clock by at most 50 ms each', () => {
  const guard = createPressSettle();
  assert.equal(guard.tick(0), 0, 'the first tick only starts the clock');
  guard.arm({ x: 100, y: 100, pointerType: 'touch', id: 'close-modal' });
  assert.equal(guard.tick(5000), 50);
  assert.equal(guard.swallow({ type: 'pointerdown', x: 100, y: 100, pointerId: 2 }), true, 'a tap queued behind a slow frame is still inside');
  for (let frame = 2; frame <= 8; frame++) guard.tick(frame * 5000);
  assert.equal(guard.tick(40000), 400);
  assert.equal(guard.counters.open, true);
  assert.equal(guard.tick(30000), 400, 'time that runs backwards adds nothing');
  assert.equal(guard.tick(Number.NaN), 400);
  assert.equal(guard.tick(30049), 449);
  assert.equal(guard.tick(30050), 450);
  assert.equal(guard.tick(30101), 500, 'a 51 ms frame counts 50');
  assert.equal(guard.counters.open, false);
  const fine = createPressSettle({ maxFrameMs: 100 });
  fine.tick(0); assert.equal(fine.tick(250), 100);
});

test('a window of 0 ms or less switches the guard off', () => {
  for (const windowMs of [0, -5]) {
    const { guard } = setup({ windowMs });
    assert.equal(guard.arm({ x: 100, y: 100, pointerType: 'mouse', id: 'talk' }), false);
    assert.deepEqual(tap(guard, 100, 100), [false, false, false]);
    assert.deepEqual(guard.counters, { armed: 0, swallowed: 0, open: false });
  }
  const { guard, wait } = setup();
  assert.equal(guard.arm({ x: 100, y: 100, pointerType: 'mouse', windowMs: 0 }), false, 'an arm-time override of 0 is off too');
  assert.equal(guard.arm({ x: 100, y: 100, pointerType: 'mouse', windowMs: Number.NaN }), false);
  assert.equal(guard.arm({ x: 100, y: 100, pointerType: 'mouse', windowMs: 100 }), true);
  wait(99); assert.equal(guard.counters.open, true);
  wait(1); assert.equal(guard.counters.open, false);
  assert.equal(guard.arm({ x: Number.NaN, y: 100, pointerType: 'mouse' }), false, 'no spot, no window');
});

test('a tap armed after its release lets its own click through, unless it claims it, and settles the next tap', () => {
  const { guard, wait } = setup();
  assert.equal(guard.swallow({ type: 'pointerdown', x: 100, y: 100, pointerType: 'touch', pointerId: 7 }), false);
  assert.equal(guard.swallow({ type: 'pointerup', x: 100, y: 100, pointerType: 'touch', pointerId: 7 }), false);
  guard.arm({ x: 100, y: 100, pointerType: 'touch', id: '' });
  assert.equal(guard.swallow({ type: 'click', x: 100, y: 100, pointerType: 'touch', detail: 1 }), false);
  wait(150);
  assert.deepEqual(tap(guard, 110, 105, live('choose-table'), 'touch', 8), [true, true, true]);
  assert.deepEqual(guard.counters, { armed: 1, swallowed: 1, open: true });
  wait(450);
  assert.equal(guard.swallow({ type: 'pointerdown', x: 100, y: 100, pointerType: 'touch', pointerId: 9 }), false);
  assert.equal(guard.swallow({ type: 'pointerup', x: 100, y: 100, pointerType: 'touch', pointerId: 9 }), false);
  assert.equal(guard.arm({ x: 100, y: 100, pointerType: 'touch', id: '', claim: true }), true);
  assert.equal(guard.swallow({ type: 'click', x: 100, y: 100, pointerType: 'touch', detail: 1 }), true, 'a claimed click is swallowed and counted');
  assert.deepEqual(guard.counters, { armed: 2, swallowed: 2, open: true });
  assert.equal(guard.swallow({ type: 'click', x: 300, y: 300, pointerType: 'touch', detail: 1 }), false, 'the claim covers one click');
  assert.equal(guard.arm({ x: 100, y: 100, pointerType: 'touch', claim: true, windowMs: 0 }), false);
  assert.equal(guard.swallow({ type: 'click', x: 100, y: 100, pointerType: 'touch', detail: 1 }), false, 'a guard switched off claims nothing');
});

test('a cancelled swallowed press is swallowed and forgotten', () => {
  const { guard } = setup();
  guard.arm({ x: 100, y: 100, pointerType: 'touch', id: 'talk' });
  assert.equal(guard.swallow({ type: 'pointerdown', x: 100, y: 100, pointerId: 3 }), true);
  assert.equal(guard.swallow({ type: 'pointercancel', x: 100, y: 100, pointerId: 3 }), true);
  assert.equal(guard.swallow({ type: 'pointercancel', x: 100, y: 100, pointerId: 3 }), false);
  assert.equal(guard.swallow({ type: 'pointercancel', x: 100, y: 100, pointerId: 4 }), false, 'an unknown pointer is never swallowed');
});

test('counters report armed, swallowed and open as a fresh snapshot', () => {
  const { guard, wait } = setup();
  assert.deepEqual(guard.counters, { armed: 0, swallowed: 0, open: false });
  guard.arm({ x: 10, y: 10, pointerType: 'mouse', id: 'a' });
  tap(guard, 10, 10);
  guard.arm({ x: 200, y: 10, pointerType: 'mouse', id: 'b' });
  tap(guard, 200, 12); tap(guard, 199, 10);
  const snapshot = guard.counters;
  assert.deepEqual(snapshot, { armed: 2, swallowed: 3, open: true });
  snapshot.armed = 99;
  assert.equal(guard.counters.armed, 2);
  wait(450);
  assert.deepEqual(guard.counters, { armed: 2, swallowed: 3, open: false });
});

class FakeElement {
  constructor(tag, { id = '', attrs = {}, parent = null, disabled = false, control = null } = {}) { Object.assign(this, { tagName: tag.toUpperCase(), id, attrs, parentElement: parent, disabled, control, checked: false, open: false, isConnected: true }); }
  getAttribute(name) { return Object.hasOwn(this.attrs, name) ? String(this.attrs[name]) : null; }
  matches(selector) {
    return selector.split(',').map(part => part.trim()).some(part => {
      const match = part.match(/^([\w-]*)(?:\[([\w-]+)(?:=([\w-]+))?\])?$/);
      if (!match || !(match[1] || match[2])) throw new Error(`FakeElement cannot match ${part}`);
      const [, tag, name, value] = match;
      return (!tag || this.tagName === tag.toUpperCase()) && (!name || (value === undefined ? Object.hasOwn(this.attrs, name) : this.attrs[name] === value));
    });
  }
  closest(selector) { for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node; return null; }
  contains(other) { for (let node = other; node; node = node.parentElement) if (node === this) return true; return false; }
}
const checkbox = (id, parent) => new FakeElement('input', { id, attrs: { type: 'checkbox' }, parent });

// elementFromPoint answers only for points a test registered with point(element, x, y) and fails on any other point.
function fakePage({ timers = false, forward = { detail: 0 } } = {}) {
  const listeners = [], frames = new Map(), acted = [], under = new Map();
  let nextFrame = 1, now = 0;
  const doc = {
    addEventListener(type, fn, capture = false) { listeners.push({ type, fn, capture: capture === true || capture?.capture === true }); },
    removeEventListener(type, fn, capture = false) { const phase = capture === true || capture?.capture === true, i = listeners.findIndex(l => l.type === type && l.fn === fn && l.capture === phase); if (i >= 0) listeners.splice(i, 1); },
    elementFromPoint(x, y) { const key = `${x},${y}`; if (!under.has(key)) throw new Error(`elementFromPoint(${x}, ${y}) was not expected`); return under.get(key); },
  };
  const win = timers
    ? { performance: { now: () => now }, setTimeout(callback, ms) { assert.equal(ms, 16); frames.set(nextFrame, () => callback()); return nextFrame++; }, clearTimeout(id) { frames.delete(id); } }
    : { requestAnimationFrame(callback) { frames.set(nextFrame, callback); return nextFrame++; }, cancelAnimationFrame(id) { frames.delete(id); } };
  doc.defaultView = win;
  const frame = (ms = 16) => { now += ms; const due = [...frames.values()]; frames.clear(); for (const callback of due) callback(now); };
  const dispatch = (type, target, props = {}) => {
    const event = { type, target, clientX: 100, clientY: 100, pointerType: 'mouse', pointerId: 1, button: 0, detail: type === 'click' ? 1 : 0, stopped: false, prevented: false, stopImmediatePropagation() { this.stopped = true; }, preventDefault() { this.prevented = true; }, ...props };
    for (const l of [...listeners.filter(l => l.type === type && l.capture), ...listeners.filter(l => l.type === type && !l.capture)]) { if (event.stopped) break; l.fn(event); }
    if (type === 'click' && !event.prevented && target) {
      const label = target.closest('label');
      if (target.matches('input[type=checkbox]')) target.checked = !target.checked;
      else if (target.matches('summary')) target.parentElement.open = !target.parentElement.open;
      else if (label?.control && !label.contains(target.closest('button, a[href], input'))) dispatch('click', label.control, { ...props, pointerType: '', pointerId: undefined, ...forward });
    }
    return event;
  };
  const click = (target, props) => ['pointerdown', 'pointerup', 'click'].map(type => dispatch(type, target, props));
  doc.addEventListener('click', event => acted.push(event.target.id));
  return { doc, win, listeners, frames, frame, dispatch, click, acted, point: (element, x = 100, y = 100) => { under.set(`${x},${y}`, element); } };
}

test('installPressSettle listens in capture phase on the document and disposes cleanly', () => {
  const page = fakePage();
  const settle = installPressSettle(page.doc, page.win);
  assert.deepEqual(page.listeners.filter(l => l.capture).map(l => l.type), [...PRESS_SETTLE_EVENTS, 'keydown'], 'the pointer events, and keydown for held keys');
  assert.deepEqual(PRESS_SETTLE_EVENTS, ['pointerdown', 'pointerup', 'pointercancel', 'click']);
  assert.equal(page.frames.size, 1, 'one requestAnimationFrame clock');
  page.frame(); assert.equal(page.frames.size, 1, 'the clock reschedules itself');
  assert.deepEqual({ ...page.win.__tenderloinPressSettle }, { armed: 0, swallowed: 0, open: false });
  settle.dispose(); settle.dispose();
  assert.deepEqual(page.listeners.filter(l => l.capture), []);
  assert.equal(page.frames.size, 0);
  assert.equal(page.win.__tenderloinPressSettle, undefined);
  assert.equal(settle.tap({ clientX: 1, clientY: 1, pointerType: 'mouse', button: 0 }), false);
  assert.equal(installPressSettle(page.doc).snapshot().armed, 0, 'the window defaults to the document’s view');
});

test('a held Enter key never activates a control again, as Godot ignores echo events', () => {
  const page = fakePage();
  const settle = installPressSettle(page.doc, page.win);
  const key = (target, props = {}) => page.dispatch('keydown', target, { key: 'Enter', repeat: false, clientX: undefined, clientY: undefined, pointerType: undefined, detail: undefined, ...props });
  const pack = new FakeElement('button', { id: 'confirm-pack' });
  assert.equal(key(pack).prevented, false, 'the first Enter acts');
  assert.equal(key(pack, { repeat: true }).prevented, true, 'its repeats press nothing, whatever button focus moved to');
  const controls = [new FakeElement('a', { attrs: { href: '#' } }), new FakeElement('summary'), new FakeElement('input', { attrs: { type: 'submit' } }), new FakeElement('div', { attrs: { role: 'button' } }), new FakeElement('span', { parent: new FakeElement('button', { id: 'world-prompt' }) })];
  for (const control of controls) assert.equal(key(control, { repeat: true }).prevented, true, `${control.tagName} inside a control`);
  assert.equal(key(new FakeElement('input', { attrs: { type: 'text' } }), { repeat: true }).prevented, false, 'text entry keeps its repeats');
  assert.equal(key(new FakeElement('canvas', { id: 'world' }), { repeat: true }).prevented, false, 'the map handles its own keys');
  for (const other of ['Tab', ' ', 'ArrowDown', 'e']) assert.equal(key(pack, { key: other, repeat: true }).prevented, false, `a held ${JSON.stringify(other)} is not touched`);
  page.win.__tenderloinPressSettleMs = 0;
  assert.equal(key(pack, { repeat: true }).prevented, true, 'switching the press window off leaves the repeat rule on');
  assert.deepEqual(settle.snapshot(), { armed: 0, swallowed: 0, open: false }, 'keys never arm or count as swallowed presses');
  settle.dispose();
  assert.equal(key(pack, { repeat: true }).prevented, false, 'dispose removes the key listener');
});

test('without requestAnimationFrame the clock runs on 16 ms timers and performance.now()', () => {
  const page = fakePage({ timers: true });
  const settle = installPressSettle(page.doc, page.win);
  const talk = new FakeElement('button', { id: 'talk' });
  page.frame(); page.click(talk);
  for (let i = 0; i < 28; i++) page.frame();
  assert.equal(settle.snapshot().open, true, '448 ms in');
  page.frame();
  assert.equal(settle.snapshot().open, false, '464 ms in');
  page.click(talk);
  for (let i = 0; i < 9; i++) page.frame(5000);
  assert.equal(settle.snapshot().open, false, 'the timer clock is capped at 50 ms a frame too');
  settle.dispose();
  assert.equal(page.frames.size, 0, 'dispose clears the timer');
});

test('a double click on a button acts once: the repeat stops in capture', () => {
  const page = fakePage();
  const settle = installPressSettle(page.doc, page.win);
  const choose = new FakeElement('button', { id: 'choose-table' });
  page.frame();
  assert.ok(page.click(choose).every(event => !event.stopped && !event.prevented));
  assert.deepEqual(settle.snapshot(), { armed: 1, swallowed: 0, open: true });
  page.frame();
  const repeat = page.click(choose, { clientX: 110, clientY: 96 });
  assert.ok(repeat.every(event => event.stopped && event.prevented), 'pointerdown, pointerup and click are all stopped');
  assert.deepEqual(page.acted, ['choose-table']);
  assert.deepEqual(settle.snapshot(), { armed: 1, swallowed: 1, open: true });
  assert.equal(JSON.stringify(page.win.__tenderloinPressSettle), '{"armed":1,"swallowed":1,"open":true}');
  for (let i = 0; i < 30; i++) page.frame();
  assert.equal(page.win.__tenderloinPressSettle.open, false);
  assert.ok(page.click(choose).every(event => !event.stopped));
  assert.deepEqual(page.acted, ['choose-table', 'choose-table']);
  settle.dispose();
});

test('clicks with detail 0 never arm and are never swallowed', () => {
  const page = fakePage();
  const settle = installPressSettle(page.doc, page.win);
  const open = new FakeElement('button', { id: 'open-block' });
  page.frame();
  const keyboard = { clientX: 0, clientY: 0, pointerType: '', detail: 0 };
  assert.equal(page.dispatch('click', open, keyboard).stopped, false);
  assert.equal(page.dispatch('click', open, keyboard).stopped, false);
  assert.deepEqual(settle.snapshot(), { armed: 0, swallowed: 0, open: false });
  page.click(open);
  assert.equal(page.dispatch('click', open, { ...keyboard, clientX: 100, clientY: 100 }).stopped, false);
  assert.deepEqual(settle.snapshot(), { armed: 1, swallowed: 0, open: true });
  assert.deepEqual(page.acted, ['open-block', 'open-block', 'open-block', 'open-block']);
  settle.dispose();
});

test('a pointerless click with detail 1, from assistive technology or a browser without pointer events, is judged on its own', () => {
  const page = fakePage();
  const settle = installPressSettle(page.doc, page.win);
  const open = new FakeElement('button', { id: 'open-block' }), next = new FakeElement('button', { id: 'next' });
  page.frame(); page.click(open); page.frame();
  const assistive = { pointerType: undefined, pointerId: undefined };
  assert.equal(page.dispatch('click', next, { ...assistive, clientX: 110 }).stopped, true, 'inside the window');
  assert.equal(page.dispatch('click', next, { ...assistive, clientX: 400 }).stopped, false, 'outside it');
  assert.equal(settle.snapshot().armed, 2, 'and it arms its own window');
  assert.deepEqual(page.acted, ['open-block', 'next']);
  settle.dispose();
});

test('only enabled controls arm, and buttons, links, summaries, toggles and ARIA widgets all count', () => {
  const page = fakePage();
  const settle = installPressSettle(page.doc, page.win);
  for (const node of [new FakeElement('canvas', { id: 'world' }), new FakeElement('button', { id: 'host-complete', disabled: true }), new FakeElement('div', { id: 'tile', attrs: { role: 'button', 'aria-disabled': 'true' } }),
    new FakeElement('input', { id: 'off', attrs: { type: 'checkbox' }, disabled: true }), new FakeElement('a', { id: 'anchor' }), new FakeElement('input', { id: 'volume', attrs: { type: 'range' } }),
    new FakeElement('span', { parent: new FakeElement('label', { control: new FakeElement('input', { id: 'volume', attrs: { type: 'range' } }) }) }), new FakeElement('label', { id: 'loose' })]) {
    page.click(node); for (let i = 0; i < 30; i++) page.frame();
  }
  assert.equal(settle.snapshot().armed, 0, 'a canvas, disabled controls, a link without href, a range and its label never arm');
  const armers = [new FakeElement('span', { parent: new FakeElement('div', { id: 'tile', attrs: { role: 'button' } }) }), new FakeElement('input', { id: 'go', attrs: { type: 'submit' } }),
    checkbox('motion'), new FakeElement('input', { id: 'pick', attrs: { type: 'radio' } }), new FakeElement('summary', { parent: new FakeElement('details') }),
    new FakeElement('a', { id: 'download-keepsake', attrs: { href: 'data:,', download: 'keepsake.svg' } }), ...['link', 'checkbox', 'radio', 'switch', 'tab', 'menuitem'].map(role => new FakeElement('div', { attrs: { role } }))];
  for (const [i, node] of armers.entries()) {
    page.click(node);
    assert.equal(settle.snapshot().armed, i + 1, `${node.tagName.toLowerCase()} ${JSON.stringify(node.attrs)} arms`);
    assert.ok(page.click(node, { clientX: 104 }).every(event => event.stopped), 'and its double click is one press');
    for (let j = 0; j < 30; j++) page.frame();
  }
  settle.dispose();
});

test('a checkbox, a details summary and a download link act once for a double click', () => {
  const page = fakePage();
  const settle = installPressSettle(page.doc, page.win);
  const motion = checkbox('motion'), details = new FakeElement('details'), summary = new FakeElement('summary', { id: 'memories', parent: details });
  const download = new FakeElement('a', { id: 'download-keepsake', attrs: { href: 'data:,', download: 'tenderloin-redux-afternoon.svg' } });
  page.frame();
  page.click(motion); page.frame(); page.click(motion, { clientX: 103 });
  assert.equal(motion.checked, true, 'the toggle does not undo itself');
  for (let i = 0; i < 30; i++) page.frame();
  page.click(summary); page.frame(); page.click(summary, { clientY: 105 });
  assert.equal(details.open, true);
  for (let i = 0; i < 30; i++) page.frame();
  page.click(download); page.frame(); page.click(download, { clientX: 96 });
  assert.deepEqual(page.acted, ['motion', 'memories', 'download-keepsake'], 'the keepsake downloads once');
  for (let i = 0; i < 30; i++) page.frame();
  page.click(motion);
  assert.equal(motion.checked, false, 'after the window a new click toggles');
  settle.dispose();
});

test('a label row toggles its checkbox once per double click, whatever detail the forwarded click carries', () => {
  for (const forward of [{ detail: 0, clientX: 0, clientY: 0 }, { detail: 1 }]) {
    const page = fakePage({ forward });
    const settle = installPressSettle(page.doc, page.win);
    const row = new FakeElement('label', { attrs: { for: 'voices-enabled' } }), voices = checkbox('voices-enabled', row), text = new FakeElement('span', { parent: row });
    row.control = voices;
    page.frame();
    const first = page.click(text);
    assert.equal(voices.checked, true, `a label click still toggles (forwarded detail ${forward.detail})`);
    assert.ok(first.every(event => !event.stopped));
    assert.deepEqual(settle.snapshot(), { armed: 1, swallowed: 0, open: true }, 'the label arms once, for its control');
    page.frame();
    assert.ok(page.click(text, { clientX: 108 }).every(event => event.stopped), 'the second click on the row');
    assert.equal(voices.checked, true, 'is one press');
    page.click(voices, { clientX: 112 });
    assert.equal(voices.checked, true, 'and so is a second click on the box itself');
    for (let i = 0; i < 30; i++) page.frame();
    page.click(text);
    assert.equal(voices.checked, false, 'after the window the row toggles again');
    for (let i = 0; i < 30; i++) page.frame();
    page.click(voices); page.frame();
    assert.equal(voices.checked, true, 'a click right on the box toggles it and arms for the box');
    assert.equal(page.dispatch('click', voices, { pointerType: undefined, pointerId: undefined, clientX: 104 }).stopped, true, 'relaying nothing, so a pointerless click there is judged as a press');
    assert.deepEqual(page.acted, ['', 'voices-enabled', '', 'voices-enabled', 'voices-enabled']);
    settle.dispose();
  }
});

test('a label click that the page cancels relays nothing to the next press', () => {
  const page = fakePage({ forward: { detail: 1 } });
  const settle = installPressSettle(page.doc, page.win);
  const row = new FakeElement('label'), photo = checkbox('photo-bea', row), text = new FakeElement('span', { parent: row });
  row.control = photo;
  page.doc.addEventListener('click', event => { if (event.target === text) event.preventDefault(); });
  page.frame();
  page.click(text);
  assert.equal(photo.checked, false, 'the label did not forward');
  assert.equal(settle.snapshot().armed, 1);
  page.frame();
  assert.ok(page.click(photo, { clientX: 104 }).every(event => event.stopped), 'a second press on the box itself is still one press');
  assert.equal(photo.checked, false);
  settle.dispose();
});

test('a rapid control repeats by id across a re-render and drift is swallowed', () => {
  const page = fakePage();
  const settle = installPressSettle(page.doc, page.win);
  const tools = new FakeElement('div', { attrs: { 'data-rapid': '' } });
  const zoom = new FakeElement('button', { id: 'zoom-in', parent: tools });
  const at = { clientX: 300, clientY: 40 }, near = { clientX: 306, clientY: 44 };
  page.frame();
  page.click(zoom, at);
  zoom.isConnected = false;
  const rerendered = new FakeElement('button', { id: 'zoom-in', parent: tools });
  page.point(rerendered, 306, 44); page.frame();
  assert.ok(page.click(rerendered, near).every(event => !event.stopped), 'same id, still rapid, enabled and under the pointer');
  assert.equal(settle.snapshot().armed, 2, 'the repeat re-arms');
  page.point(new FakeElement('button', { id: 'zoom-out', parent: tools }), 306, 44); page.frame();
  assert.ok(page.click(rerendered, near).every(event => event.stopped), 'a different id under the pointer');
  page.point(new FakeElement('button', { id: 'zoom-in', parent: tools, disabled: true }), 306, 44);
  assert.ok(page.click(rerendered, near).every(event => event.stopped), 'the same id, disabled');
  const detached = new FakeElement('button', { id: 'zoom-in', parent: tools }); detached.isConnected = false;
  page.point(detached, 306, 44);
  assert.ok(page.click(rerendered, near).every(event => event.stopped), 'the same id, no longer in the document');
  page.point(null, 306, 44);
  assert.ok(page.click(rerendered, near).every(event => event.stopped), 'nothing under the pointer');
  const optOut = new FakeElement('button', { id: 'zoom-in', parent: new FakeElement('div', { attrs: { 'data-rapid': 'false' }, parent: tools }) });
  page.point(optOut, 306, 44);
  assert.ok(page.click(optOut, near).every(event => event.stopped), 'the nearest data-rapid="false" opts out');
  assert.deepEqual(settle.snapshot(), { armed: 2, swallowed: 5, open: true });
  settle.dispose();
});

test('window.__tenderloinPressSettleMs is read at arm time and 0 switches the guard off', () => {
  const page = fakePage();
  const settle = installPressSettle(page.doc, page.win);
  const talk = new FakeElement('button', { id: 'talk' });
  page.frame();
  page.win.__tenderloinPressSettleMs = 0;
  page.click(talk); page.frame();
  assert.ok(page.click(talk).every(event => !event.stopped));
  assert.deepEqual(settle.snapshot(), { armed: 0, swallowed: 0, open: false });
  page.win.__tenderloinPressSettleMs = 100;
  page.click(talk);
  assert.equal(settle.snapshot().open, true);
  for (let i = 0; i < 6; i++) page.frame();
  assert.equal(settle.snapshot().open, true, '96 ms in');
  page.frame();
  assert.equal(settle.snapshot().open, false, '112 ms in');
  delete page.win.__tenderloinPressSettleMs;
  page.click(talk);
  for (let i = 0; i < 9; i++) page.frame(5000);
  assert.equal(settle.snapshot().open, false, 'nine slow frames are 450 ms on the capped clock');
  page.click(talk);
  for (let i = 0; i < 8; i++) page.frame(5000);
  assert.equal(settle.snapshot().open, true, 'eight are 400 ms');
  settle.dispose();
});

function canvasPage() {
  const page = fakePage();
  const settle = installPressSettle(page.doc, page.win);
  const canvas = new FakeElement('canvas', { id: 'world' }), opened = [];
  let opens = null;
  page.doc.addEventListener('pointerup', event => { if (event.target !== canvas) return; if (opens) page.point(opens, event.clientX, event.clientY); opened.push(settle.tap(event)); });
  page.point(canvas); page.point(canvas, 110, 100); page.point(canvas, 300, 40); page.frame();
  return { page, settle, canvas, opened, opening: element => { opens = element; } };
}

test('a canvas tap that opens a dialog under the finger arms the guard and claims its own click', () => {
  const { page, settle, canvas, opened, opening } = canvasPage();
  const dialogButton = new FakeElement('button', { id: 'meet-bea' });
  opening(dialogButton);
  const first = page.click(canvas, { pointerType: 'touch', pointerId: 5 });
  assert.deepEqual(first.map(event => event.stopped), [false, false, true], 'the tap acted on pointerup; its click is not a second press');
  assert.deepEqual(opened, [true]);
  assert.deepEqual(settle.snapshot(), { armed: 1, swallowed: 1, open: true });
  page.frame();
  assert.ok(page.click(dialogButton, { pointerType: 'touch', pointerId: 6, clientX: 130 }).every(event => event.stopped), 'the second tap lands on the dialog it opened');
  assert.deepEqual(page.acted, []);
  assert.equal(settle.tap({ target: canvas, clientX: 100, clientY: 100, pointerType: 'mouse', button: 2 }), false, 'only a primary tap arms');
  settle.dispose();
});

// Blink hit-tests a touch click after touchend, so the click of the tap that opened a dialog goes to the dialog's button.
test('a canvas tap that opens a dialog does not press the button the browser sends its click to', () => {
  const { page, settle, canvas, opened, opening } = canvasPage();
  const choose = new FakeElement('button', { id: 'choose-floor' });
  opening(choose);
  const events = [page.dispatch('pointerdown', canvas, { pointerType: 'touch', pointerId: 5 }), page.dispatch('pointerup', canvas, { pointerType: 'touch', pointerId: 5 }), page.dispatch('click', choose, { pointerType: 'touch' })];
  assert.deepEqual(events.map(event => event.stopped), [false, false, true]);
  assert.deepEqual([opened, page.acted], [[true], []], 'one tap opened the dialog and chose nothing in it');
  assert.deepEqual(settle.snapshot(), { armed: 1, swallowed: 1, open: true });
  settle.dispose();
});

test('a canvas tap that walks or opens nothing under the finger leaves the next press free', () => {
  const { page, settle, canvas, opened } = canvasPage();
  const stop = new FakeElement('button', { id: 'stop-walking' }), zoom = new FakeElement('button', { id: 'zoom-in', parent: new FakeElement('div', { attrs: { 'data-rapid': '' } }) });
  page.click(canvas, { pointerType: 'touch', pointerId: 5 });
  assert.deepEqual(opened, [false]);
  page.frame();
  assert.equal(page.dispatch('pointerdown', canvas, { pointerType: 'touch', pointerId: 6, clientX: 110 }).stopped, false, 'a drag-pan that starts at the tap');
  page.dispatch('pointercancel', canvas, { pointerType: 'touch', pointerId: 6, clientX: 110 });
  assert.ok(page.click(canvas, { pointerType: 'touch', pointerId: 7, clientX: 110 }).every(event => !event.stopped), 'a re-tap that re-routes the walk');
  assert.ok(page.click(stop, { pointerType: 'touch', pointerId: 8, clientX: 120 }).every(event => !event.stopped), 'Stop walking beside the tap');
  page.frame(); for (let i = 0; i < 30; i++) page.frame();
  page.click(canvas, { pointerType: 'touch', pointerId: 9 });
  assert.ok(page.click(zoom, { pointerType: 'touch', pointerId: 10, clientX: 120 }).every(event => !event.stopped), 'Zoom beside the tap');
  assert.deepEqual(page.acted, ['world', 'world', 'stop-walking', 'world', 'zoom-in']);
  assert.deepEqual(opened, [false, false, false]);
  assert.equal(settle.snapshot().swallowed, 0);
  settle.dispose();
});

test('a canvas tap arms only for a tapped element with something new over the point', () => {
  const page = fakePage();
  const settle = installPressSettle(page.doc, page.win);
  const map = new FakeElement('div', { id: 'map' }), marker = new FakeElement('span', { parent: map });
  page.point(marker, 50, 60); page.point(null, 70, 80); page.point(new FakeElement('dialog', { id: 'modal' }), 90, 10);
  const at = (clientX, clientY, target = map) => settle.tap({ target, clientX, clientY, pointerType: 'touch', button: 0 });
  assert.equal(at(50, 60), false, 'a child of the tapped element is not something new');
  assert.equal(at(70, 80), false, 'nothing at the point');
  assert.equal(at(90, 10, null), false, 'no tapped element to compare with');
  assert.equal(settle.snapshot().armed, 0);
  assert.equal(at(90, 10), true, 'a dialog over the point');
  assert.deepEqual(settle.snapshot(), { armed: 1, swallowed: 0, open: true });
  settle.dispose();
});

test('a canvas tap without pointerType takes the radius of the pointer that pressed', () => {
  for (const [pointerType, stopped] of [['touch', true], ['mouse', false]]) {
    const { page, settle, canvas, opening } = canvasPage();
    const dialogButton = new FakeElement('button', { id: 'meet-bea' });
    opening(dialogButton);
    page.dispatch('pointerdown', canvas, { pointerType });
    page.dispatch('pointerup', canvas, { pointerType: '' });
    assert.equal(settle.snapshot().armed, 1);
    page.frame();
    assert.equal(page.dispatch('pointerdown', dialogButton, { pointerType, pointerId: 2, clientX: 134 }).stopped, stopped, pointerType);
    settle.dispose();
  }
});

test('a click without pointerType takes the radius of the pointer that made it', () => {
  for (const [pointerType, stopped] of [['touch', true], ['mouse', false], ['pen', true]]) {
    const page = fakePage();
    const settle = installPressSettle(page.doc, page.win);
    const close = new FakeElement('button', { id: 'close-modal' });
    page.frame();
    page.dispatch('pointerdown', close, { pointerType });
    page.dispatch('pointerup', close, { pointerType });
    page.dispatch('click', close, { pointerType: undefined, pointerId: undefined });
    page.frame();
    assert.equal(page.dispatch('pointerdown', close, { pointerType, pointerId: 2, clientX: 134 }).stopped, stopped, pointerType);
    assert.equal(page.dispatch('pointercancel', close, { pointerType, pointerId: 2, clientX: 134 }).stopped, stopped, `${pointerType} cancel`);
    assert.equal(page.dispatch('pointercancel', close, { pointerType, pointerId: 3 }).stopped, false, 'a pointer that was never pressed');
    settle.dispose();
  }
});
