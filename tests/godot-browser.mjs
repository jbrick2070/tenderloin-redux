import { mkdir, stat, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const [pckStat, ...sourceStats] = await Promise.all([
  stat('artifacts/godot-web/index.pck'),
  stat('godot/main.gd'),
  stat('godot/main.tscn'),
  stat('godot/project.godot'),
  stat('godot/export_presets.cfg'),
  stat('godot/data/buildings.json')
]);
for (const srcStat of sourceStats) {
  assert.ok(pckStat.mtimeMs >= srcStat.mtimeMs, 'artifacts/godot-web/index.pck is older than Godot project sources; run npm run godot:export first');
}
const BROWSER_SAVE_SENTINEL = JSON.stringify({ schema: 'tenderloin-redux.save', version: 1, sentinel: 'preserve-browser-save-v1' });
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const base = 'http://127.0.0.1:' + (process.env.GODOT_PORT || 4174) + '/';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [], external = [], runs = [];
try {
  for (const size of [{ width: 1100, height: 760 }, { width: 390, height: 667 }, { width: 320, height: 667 }]) {
    const context = await browser.newContext({ viewport: size });
    await context.addInitScript((sentinel) => {
      if (window.localStorage.getItem('tenderloin-redux.save.v1') === null) {
        window.localStorage.setItem('tenderloin-redux.save.v1', sentinel);
      }
    }, BROWSER_SAVE_SENTINEL);
    context.on('request', r => { if (!r.url().startsWith(base) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) external.push(r.url()); });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(base);
    await page.locator('#status').waitFor({ state: 'hidden', timeout: 60000 });
    await page.waitForTimeout(1200);
    const before = await page.screenshot({ path: `artifacts/godot-${size.width}-overview.png` });
    // Native Godot Control buttons are canvas pixels, not DOM accessibility nodes.
    // Next is button index 2: desktop right/top row; phone left/middle row.
    // Grid: 12px side/bottom margin, 50px buttons, 4px row gap, 2/3 columns.
    await page.mouse.click(size.width * (size.width < 600 ? .25 : .83), size.height - 98);
    await page.waitForTimeout(300);
    const after = await page.screenshot({ path: `artifacts/godot-${size.width}-selected.png` });
    assert.notDeepEqual(before, after, `Next building must change view at ${size.width}`);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    const keyboard = await page.screenshot();
    assert.notDeepEqual(after, keyboard, 'Tab then Enter must visibly activate Zoom in');
    // Click "Walk to neighbor" (button index 5: bottom-right of 3x2 desktop or 2x3 phone grid)
    await page.mouse.click(size.width * (size.width < 600 ? .75 : .83), size.height - 38);
    await page.waitForTimeout(900);
    const neighbor = await page.screenshot({ path: `artifacts/godot-${size.width}-neighbor.png` });
    assert.notDeepEqual(keyboard, neighbor, `Walk to neighbor must visibly advance player/camera at ${size.width}`);
    // Press KeyE to walk to Celeste and talk upon arrival (which saves initial state and opens MuralPanel)
    await page.keyboard.press('KeyE');
    await page.waitForFunction(() => Boolean(window.localStorage.getItem('tenderloin-redux.godot.save.v1')), null, { timeout: 25000 });
    await page.waitForTimeout(250);
    const row2Y = size.height - (size.width < 600 ? 258 : 208);
    const row1Y = size.height - (size.width < 600 ? 305 : 255);
    await page.mouse.click(size.width * 0.20, row2Y);
    await page.waitForTimeout(120);
    await page.mouse.click(size.width * 0.50, row2Y);
    await page.waitForTimeout(120);
    await page.mouse.click(size.width * 0.80, row2Y);
    await page.waitForTimeout(120);
    await page.mouse.click(size.width * 0.72, row1Y);
    await page.waitForTimeout(250);
    const muralShot = await page.screenshot({ path: `artifacts/godot-${size.width}-mural.png` });
    assert.notDeepEqual(neighbor, muralShot, `Portable mural panel and motif placement must visibly update canvas at ${size.width}`);
    const storageBeforeReload = await page.evaluate(() => ({
      godotSave: window.localStorage.getItem('tenderloin-redux.godot.save.v1'),
      browserSave: window.localStorage.getItem('tenderloin-redux.save.v1')
    }));
    assert.equal(storageBeforeReload.browserSave, BROWSER_SAVE_SENTINEL, 'Godot Web export must preserve browser game tenderloin-redux.save.v1 sentinel');
    assert.ok(storageBeforeReload.godotSave, `Godot Web export must persist to tenderloin-redux.godot.save.v1 at ${size.width}`);
    const parsedSave = JSON.parse(storageBeforeReload.godotSave);
    assert.equal(parsedSave.schema, 'tenderloin-redux.godot.save');
    assert.equal(parsedSave.version, 1);
    assert.ok(parsedSave.save_seq >= 5, 'save_seq must increment across talk, 3 motif placements, and palette change');
    assert.equal(parsedSave.celeste_talk_count, 1);
    assert.equal(parsedSave.mural_palette, 'sunset');
    assert.deepEqual(Object.keys(parsedSave.mural_placements).sort(), ['rise', 'sun', 'wave']);
    await page.reload();
    await page.locator('#status').waitFor({ state: 'hidden', timeout: 60000 });
    await page.waitForTimeout(600);
    // Prove load_godot_state() restored the save into the running Godot instance on reload:
    // press KeyE to walk to Celeste and talk, triggering a fresh save from Godot memory.
    await page.keyboard.press('KeyE');
    await page.waitForFunction((prevSeq) => {
      const raw = window.localStorage.getItem('tenderloin-redux.godot.save.v1');
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return parsed.save_seq > prevSeq;
    }, parsedSave.save_seq, { timeout: 25000 });
    const storageAfterReload = await page.evaluate(() => ({
      godotSave: window.localStorage.getItem('tenderloin-redux.godot.save.v1'),
      browserSave: window.localStorage.getItem('tenderloin-redux.save.v1')
    }));
    assert.equal(storageAfterReload.browserSave, BROWSER_SAVE_SENTINEL, 'Browser game save sentinel must remain intact after reload and post-reload save');
    const postReloadSave = JSON.parse(storageAfterReload.godotSave);
    assert.equal(postReloadSave.celeste_talk_count, parsedSave.celeste_talk_count + 1, 'Post-reload talk must increment restored celeste_talk_count');
    assert.equal(postReloadSave.mural_palette, 'sunset', 'Post-reload save must preserve restored sunset palette');
    assert.deepEqual(postReloadSave.mural_placements, parsedSave.mural_placements, 'Post-reload save must preserve all 3 restored motif placements');
    runs.push({ viewport: size, overviewBytes: before.length, selectedBytes: after.length, neighborBytes: neighbor.length, muralBytes: muralShot.length, keyboardActivationVerified: true, neighborWalkVerified: true, muralSaveReloadVerified: true });
    await context.close();
  }
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  await writeFile('artifacts/godot-browser.json', JSON.stringify({ runs, errors, external, limit: 'Pixel-change, isolated Godot localStorage save/reload, and driver-inspected screenshots, not DOM/screen-reader or physical-phone acceptance.' }, null, 2));
  console.log(JSON.stringify({ runs, errors, external }));
} finally { await browser.close(); }
