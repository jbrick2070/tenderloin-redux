import { mkdir, stat, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const [pckStat, mainStat, dataStat] = await Promise.all([stat('artifacts/godot-web/index.pck'), stat('godot/main.gd'), stat('godot/data/buildings.json')]);
assert.ok(pckStat.mtimeMs >= mainStat.mtimeMs && pckStat.mtimeMs >= dataStat.mtimeMs, 'artifacts/godot-web/index.pck is older than godot/main.gd or godot/data/buildings.json; run npm run godot:export first');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const base = 'http://127.0.0.1:' + (process.env.GODOT_PORT || 4174) + '/';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [], external = [], runs = [];
try {
  for (const size of [{ width: 1100, height: 760 }, { width: 390, height: 667 }, { width: 320, height: 667 }]) {
    const context = await browser.newContext({ viewport: size });
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
    runs.push({ viewport: size, overviewBytes: before.length, selectedBytes: after.length, neighborBytes: neighbor.length, keyboardActivationVerified: true, neighborWalkVerified: true });
    await context.close();
  }
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  await writeFile('artifacts/godot-browser.json', JSON.stringify({ runs, errors, external, limit: 'Pixel-change and driver-inspected screenshots, not DOM/screen-reader or physical-phone acceptance.' }, null, 2));
  console.log(JSON.stringify({ runs, errors, external }));
} finally { await browser.close(); }
