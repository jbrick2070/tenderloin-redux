import assert from 'node:assert/strict';

// Existing Godot journeys run with window.__tenderloinPressSettleMs = 0 (tests/godot-browser.mjs newTracedContext and
// tests/persistence-browser.mjs), so they can tap one spot repeatedly. Everything in this file switches the shipped 450 ms
// press settle back on, uses real double input, and puts the override back in finally.
export const gateOn = page => page.evaluate(() => { delete window.__tenderloinPressSettleMs; });
export const gateOff = page => page.evaluate(() => { window.__tenderloinPressSettleMs = 0; });
export const REST_MS = 650;   // 450 ms window plus frame latency: the least rest before the same spot works again
// The window runs on a capped frame clock, so on slow frames it lasts longer than 450 ms of wall clock: rest, then wait until
// the game reports it closed.
export async function rest(page) {
  await page.waitForTimeout(REST_MS);
  await page.waitForFunction(() => !window.__tenderloinGodotA11ySnapshot?.press_settle?.open, null, { timeout: 10000 });
}

export function pressToolkit(page, { touch }) {
  const snap = () => page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
  async function settle() {
    const f = (await snap()).ui_frame;
    await page.waitForFunction(f => { const s = window.__tenderloinGodotA11ySnapshot; return s.ui_frame > f + 5 && !s.layout_refit_pending && !s.compact_panel_layout_pending && !s.programme_studio.layout_pending; }, f);
  }
  async function centre(b) {
    assert.ok(b?.visible && !b.disabled && b.width >= 44 && b.height >= 44, 'press target is an actual enabled 44 px control');
    const s = await snap(), c = await page.locator('#canvas').boundingBox();
    return { x: c.x + (b.x + b.width / 2) * c.width / s.viewport_width, y: c.y + (b.y + b.height / 2) * c.height / s.viewport_height };
  }
  async function press(b) {
    const { x, y } = await centre(b);
    if (touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
    await settle();
  }
  // Two real presses at the centre of the target: a dblclick, or two taps 80 ms apart. Asserts that exactly one press armed the
  // gate and that the repeat was swallowed (a finger tap is two events: the emulated mouse press and the touch itself).
  async function doublePress(b, how = 'dblclick') {
    const before = (await snap()).press_settle, { x, y } = await centre(b);
    if (touch) { await page.touchscreen.tap(x, y); await page.waitForTimeout(80); await page.touchscreen.tap(x, y); }
    else if (how === 'dblclick') await page.mouse.dblclick(x, y, { delay: 40 });
    else { await page.mouse.click(x, y); await page.waitForTimeout(80); await page.mouse.click(x, y); }
    await settle();
    const after = (await snap()).press_settle;
    assert.equal(after.armed - before.armed, 1, 'exactly one press armed the gate');
    assert.ok(after.swallowed - before.swallowed >= (touch ? 2 : 1), 'the repeated press was swallowed by the gate, not by luck');
    await rest(page);
  }
  // The same double input on a rapid control that stays put: both presses act and arm, nothing is swallowed.
  async function repeatPress(b) {
    const before = (await snap()).press_settle, { x, y } = await centre(b);
    if (touch) { await page.touchscreen.tap(x, y); await page.waitForTimeout(80); await page.touchscreen.tap(x, y); }
    else await page.mouse.dblclick(x, y, { delay: 40 });
    await settle();
    const after = (await snap()).press_settle;
    assert.equal(after.armed - before.armed, 2, 'both presses of the rapid control acted');
    assert.equal(after.swallowed, before.swallowed, 'nothing was swallowed');
    await rest(page);
  }
  // Same-spot presses on a rapid control that stays put: each press arms its own window and nothing is swallowed.
  async function fastPresses(b, count = 5, gap = 120) {
    const before = (await snap()).press_settle, { x, y } = await centre(b);
    for (let i = 0; i < count; i++) { if (touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await page.waitForTimeout(gap); }
    await settle();
    const after = (await snap()).press_settle;
    assert.equal(after.swallowed, before.swallowed, 'a rapid control that stays put is never swallowed');
    assert.equal(after.armed - before.armed, count, 'every press of the rapid control acted and armed');
  }
  return { snap, settle, press, doublePress, repeatPress, fastPresses };
}

// Page: fixture with civic idle and hosting done; startup card already dismissed.
export async function verifyListeningDoublePress(page, { touch, size }) {
  const t = pressToolkit(page, { touch }); await gateOn(page);
  try {
    await page.keyboard.press('F5'); await t.settle();
    let s = await t.snap(); assert.ok(s.civic_listening.visible && s.civic_phase === 'idle');
    const saveBefore = await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1'));
    await t.doublePress(s.civic_listening.buttons.find(b => b.text === 'Start planning'));
    s = await t.snap();
    assert.equal(s.civic_phase, 'planning', `double press starts planning only (${size.width}, ${touch ? 'touch' : 'mouse'})`);
    assert.ok(s.civic_listening.buttons.some(b => b.text === 'Convene'), 'the relabelled button is offered, not used');
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1'))).civic.phase, 'planning');
    assert.notEqual(await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1')), saveBefore, 'the one deliberate save was written');
    await t.press((await t.snap()).civic_listening.buttons.find(b => b.text === 'Convene'));
    assert.equal((await t.snap()).civic_phase, 'meeting', 'a deliberate press after the window still acts');
    await rest(page);
  } finally { await gateOff(page); }
}

// Same page, Listening Hour still open: Back must close once and fire nothing beneath it.
export async function verifyCloseThrough(page, { touch, size }) {
  const t = pressToolkit(page, { touch }); await gateOn(page);
  try {
    let s = await t.snap(); assert.ok(s.civic_listening.visible);
    const before = { walk: s.walk_control_text, ground: [s.player_grounding.x, s.player_grounding.z], view: s.camera_view_size, target: s.walk_target_name };
    await t.doublePress(s.civic_listening.buttons.at(-1));
    s = await t.snap();
    assert.ok(!s.civic_listening.visible, 'Back closes the Listening Hour once');
    assert.deepEqual([s.walk_control_text, [s.player_grounding.x, s.player_grounding.z], s.camera_view_size, s.walk_target_name], [before.walk, before.ground, before.view, before.target], `second press reaches no street control (${size.width})`);
  } finally { await gateOff(page); }
}

// Page: fixture with hosting and published plan emptied; studio closed.
export async function verifyStudioDoublePress(page, { touch, size }) {
  const t = pressToolkit(page, { touch }); await gateOn(page);
  try {
    await page.keyboard.press('F6'); await t.settle();
    let s = await t.snap(); assert.ok(s.programme_studio.visible);
    const post = s.programme_studio.buttons[7]; assert.equal(post.text, 'Post');
    await t.doublePress(post);
    s = await t.snap();
    assert.equal(s.programme_published.length, 4, 'the plan is posted');
    assert.equal(s.hosting_order.length, 0, 'hosting is not started by the second press');
    assert.ok(s.programme_studio.visible && s.programme_studio.buttons[7].text === 'Start hosting', 'Start hosting is offered, not used');
  } finally { await gateOff(page); }
}

// Must-stay-fast, with the shipped gate on: Zoom In five times at one spot. Call with nothing open and Zoom In visible.
export async function verifyFastZoom(page, { touch }) {
  const t = pressToolkit(page, { touch }); await gateOn(page);
  try {
    const s = await t.snap(), zoom = s.walking_controls.find(b => b.text.includes('Zoom In') || b.text === 'Zoom +');
    assert.ok(zoom?.visible, 'Zoom In is on screen');
    await t.fastPresses(zoom, 5, 120);
    const after = await t.snap();
    assert.ok(after.camera_view_size < s.camera_view_size, 'the Zoom In presses acted');
  } finally { await gateOff(page); }
}

// Phone, finger, gate on: a rapid control repeats only while it stays put. When the short last hub page lifts the pager row,
// the second tap of a double tap on Previous would land on a hub action (District Border is a save) and is swallowed; when
// the row stays put both taps page back. In the Explore tray Zoom In stays put and keeps every quick tap. Call with nothing open.
export async function verifyRapidInPlace(page, { touch, size }) {
  const t = pressToolkit(page, { touch }); await gateOn(page);
  try {
    await page.keyboard.press('KeyG'); await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.block_panel_control.visible); await t.settle();
    let s = await t.snap(); assert.ok(s.block_hub_paged, `the hub is paged at ${size.width}`);
    const rowAt = {};
    while (s.block_hub_page < s.block_hub_pages - 1) { rowAt[s.block_hub_page] = s.block_page_previous.y; await t.press(s.block_page_next); await rest(page); s = await t.snap(); }
    const last = s.block_hub_page, district = s.district_boundary_visible, saved = await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1'));
    const moves = s.block_page_previous.y !== rowAt[last - 1];
    if (moves) await t.doublePress(s.block_page_previous); else await t.repeatPress(s.block_page_previous);
    s = await t.snap();
    assert.equal(s.block_hub_page, last - (moves ? 1 : 2), `a double tap on Previous pages back ${moves ? 'once: the row moved' : 'twice: the row stayed'} (${size.width})`);
    assert.equal(s.district_boundary_visible, district, 'District Border is not toggled');
    assert.equal(await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1')), saved, 'no save is written');
    await t.press(s.block_close_control); await rest(page);
    s = await t.snap(); assert.ok(!s.block_panel_control.visible && s.phone_disclosure.explore.visible, 'hub closed; Explore offered');
    await t.press(s.phone_disclosure.explore); await rest(page);
    assert.ok((await t.snap()).phone_disclosure.tray.visible, 'the Explore tray is open');
  } finally { await gateOff(page); }
  await verifyFastZoom(page, { touch });
}

// One real double press inside an existing journey. The caller's next assertion proves the single activation.
export async function pressTwice(page, b, { touch }) {
  const t = pressToolkit(page, { touch }); await gateOn(page);
  try { await t.doublePress(b); } finally { await gateOff(page); }
}
