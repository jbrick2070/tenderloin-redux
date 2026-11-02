// 0a in headed Chrome (real window): Pointer Lock from a click, Esc behaviour,
// re-lock delay after an Esc exit, and what happens on a tab switch.
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const out = process.env.SPIKE_OUT;
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1100,760', '--window-position=40,40'] });
const ctx = await browser.newContext({ viewport: { width: 1024, height: 640 } });
const page = await ctx.newPage();
const spike = () => page.evaluate(() => window.__spike || null);
const wait = ms => page.waitForTimeout(ms);
const state = async label => ({ label, t: Math.round(await page.evaluate(() => performance.now())), pointerLocked: await page.evaluate(() => !!document.pointerLockElement), godotMouseMode: (await spike()).mouse_mode, yaw: (await spike()).yaw_deg });
await page.goto('http://127.0.0.1:4180/?spike=lock');
await page.waitForFunction(() => window.__spike && window.__spike.active, null, { timeout: 180000 });
await wait(1500);
await page.evaluate(() => {
  window.__plc = [];
  const push = o => window.__plc.push({ t: Math.round(performance.now()), ...o });
  document.addEventListener('pointerlockchange', () => push({ locked: !!document.pointerLockElement }));
  document.addEventListener('pointerlockerror', () => push({ error: true }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') push({ escKeydown: true, dp: e.defaultPrevented }); }, true);
  document.addEventListener('keyup', e => { if (e.key === 'Escape') push({ escKeyup: true }); }, true);
  document.addEventListener('visibilitychange', () => push({ visibility: document.visibilityState }));
  window.addEventListener('blur', () => push({ blur: true }));
  window.addEventListener('focus', () => push({ focus: true }));
});
const steps = [];
await page.mouse.click(512, 360); await wait(700); steps.push(await state('after first click'));
await page.mouse.move(560, 360); await page.mouse.move(620, 360); await page.mouse.move(680, 360); await wait(300); steps.push(await state('after mouse move while locked'));
await page.keyboard.press('Escape'); await wait(700); steps.push(await state('after Esc'));
await page.mouse.click(512, 360); await wait(500); steps.push(await state('click 0.5 s after Esc'));
await wait(600); await page.mouse.click(512, 360); await wait(500); steps.push(await state('click ~1.6 s after Esc'));
if (!steps.at(-1).pointerLocked) { await wait(1500); await page.mouse.click(512, 360); await wait(500); steps.push(await state('click ~3.6 s after Esc')); }
// Tab switch while locked: open a second tab in front, wait, come back.
const other = await ctx.newPage(); await other.goto('about:blank'); await other.bringToFront(); await wait(1200);
steps.push(await state('while another tab is in front'));
await page.bringToFront(); await wait(900); steps.push(await state('back on the game tab, before any click'));
await page.mouse.click(512, 360); await wait(700); steps.push(await state('click after returning'));
// Godot-side release (Input.mouse_mode = VISIBLE) and a page-side exit for comparison.
await page.evaluate(() => { window.__spikeCmd = { release: true }; }); await wait(600); steps.push(await state('after Godot release'));
await page.mouse.click(512, 360); await wait(2000); steps.push(await state('click after Godot release (2 s)'));
await page.evaluate(() => document.exitPointerLock()); await wait(600); steps.push(await state('after document.exitPointerLock()'));
const result = { chrome: await browser.version(), steps, domEvents: await page.evaluate(() => window.__plc), godotLog: (await spike()).lock_log };
await writeFile(`${out}/report-3.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 1));
await browser.close();
