// Phase 0 spike harness: screenshots for 0b, a headless Pointer Lock probe for 0a,
// desktop frame stats for 0c and the WebXR support report for 0d.
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const out = process.env.SPIKE_OUT;
await mkdir(out, { recursive: true });
const base = 'http://127.0.0.1:4180/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text().slice(0, 300)); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
const spike = () => page.evaluate(() => window.__spike || null);
const cmd = async c => { await page.evaluate(c => { window.__spikeCmd = c; }, c); await page.waitForTimeout(350); };
const wait = async (ms) => page.waitForTimeout(ms);
const report = { errors, views: [], flicker: {}, lock: null, stats: [], xr: null, info: null };

await page.goto(base + '?spike=look');
await page.waitForFunction(() => window.__spike && window.__spike.active, null, { timeout: 180000 });
await wait(3500);
report.info = await spike();
await cmd({ list: true });
report.children = (await spike()).stats.children;

// 0b: eight headings from the Turk & Taylor start, fog on, then fog off and plain colour sky.
for (const yaw of [0, 45, 90, 135, 180, 225, 270, 315]) {
  await cmd({ yaw_deg: yaw, pitch_deg: 0, hide_ui: true });
  await wait(400);
  const file = `${out}/0b-yaw${String(yaw).padStart(3, '0')}.png`;
  await page.screenshot({ path: file });
  report.views.push({ yaw, file });
}
// A slight downward pitch shows the road ribbons close up for the z-fighting check.
await cmd({ yaw_deg: 0, pitch_deg: -18 });
await wait(400);
const a = await page.screenshot({ path: `${out}/0b-ribbons-a.png` });
await wait(120);
const b = await page.screenshot({ path: `${out}/0b-ribbons-b.png` });
await wait(120);
const c = await page.screenshot({ path: `${out}/0b-ribbons-c.png` });
report.flicker.sameFrameBytesEqualAB = Buffer.compare(a, b) === 0;
report.flicker.sameFrameBytesEqualAC = Buffer.compare(a, c) === 0;
await cmd({ fog: false });
await wait(400);
await page.screenshot({ path: `${out}/0b-yaw000-nofog.png` });
await cmd({ fog: true, sky: 'color' });
await wait(400);
await page.screenshot({ path: `${out}/0b-yaw000-colorsky.png` });
await cmd({ sky: 'procedural', pitch_deg: 25 });
await wait(400);
await page.screenshot({ path: `${out}/0b-sky-up.png` });
await cmd({ pitch_deg: 0, hide_ui: false });

// 0c (desktop reference): walk the autopilot loop for 12 s and collect per-second stats.
await cmd({ auto: true });
for (let i = 0; i < 12; i++) { await wait(1000); const s = await spike(); report.stats.push(s.stats); }
await cmd({ auto: false });
await page.screenshot({ path: `${out}/0c-after-walk.png` });

// 0d: WebXR interface and support flags as the Godot web build sees them (no headset here).
report.xr = (await spike()).xr;
report.navigatorXR = await page.evaluate(() => ({ hasNavigatorXR: 'xr' in navigator, secure: window.isSecureContext }));

// 0a (headless Chrome probe; the real-browser table comes from the browser pane).
await page.goto(base + '?spike=lock');
await page.waitForFunction(() => window.__spike && window.__spike.active, null, { timeout: 180000 });
await wait(1500);
await page.evaluate(() => {
  window.__plc = [];
  document.addEventListener('pointerlockchange', () => window.__plc.push({ t: performance.now(), locked: !!document.pointerLockElement }));
  document.addEventListener('pointerlockerror', () => window.__plc.push({ t: performance.now(), error: true }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') window.__plc.push({ t: performance.now(), escKeydown: true, defaultPrevented: e.defaultPrevented }); }, true);
});
await page.mouse.click(640, 360);
await wait(600);
const afterClick = { pointerLocked: await page.evaluate(() => !!document.pointerLockElement), spike: (await spike()).mouse_mode };
await page.mouse.move(700, 360);
await page.mouse.move(760, 360);
await wait(300);
const yawAfterMove = (await spike()).yaw_deg;
await page.keyboard.press('Escape');
await wait(600);
const afterEsc = { pointerLocked: await page.evaluate(() => !!document.pointerLockElement), spike: (await spike()).mouse_mode };
await page.mouse.click(640, 360);
await wait(600);
const relock1 = { pointerLocked: await page.evaluate(() => !!document.pointerLockElement), spike: (await spike()).mouse_mode };
await wait(1500);
await page.mouse.click(640, 360);
await wait(600);
const relock2 = { pointerLocked: await page.evaluate(() => !!document.pointerLockElement), spike: (await spike()).mouse_mode };
report.lock = { afterClick, yawAfterMove, afterEsc, relock1, relock2, domEvents: await page.evaluate(() => window.__plc), lockLog: (await spike()).lock_log };

await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ info: { renderer: report.info.renderer, adapter: report.info.adapter, viewport: report.info.viewport }, flicker: report.flicker, stats: report.stats.slice(-3), xr: report.xr, navigatorXR: report.navigatorXR, lock: { afterClick, afterEsc, relock1, relock2, yawAfterMove }, errors: errors.slice(0, 8) }, null, 2));
await browser.close();
