// Second pass for 0b: fog on/off down Turk and Taylor, and a pixel-level flicker
// check on the road ribbons across five consecutive frames of a still pose.
import { mkdir, writeFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const out = process.env.SPIKE_OUT;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const cmd = async c => { await page.evaluate(c => { window.__spikeCmd = c; }, c); await page.waitForTimeout(400); };
await page.goto('http://127.0.0.1:4180/?spike=look');
await page.waitForFunction(() => window.__spike && window.__spike.active, null, { timeout: 180000 });
await page.waitForTimeout(3000);

// Minimal PNG decode (8-bit RGB/RGBA, non-interlaced) so frames can be diffed per pixel.
function decodePNG(buf) {
  let off = 8; const idat = []; let w = 0, h = 0, ct = 0;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off); const type = buf.toString('ascii', off + 4, off + 8); const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    off += 12 + len;
  }
  const bpp = ct === 6 ? 4 : 3; const raw = inflateSync(Buffer.concat(idat)); const stride = w * bpp; const px = Buffer.alloc(stride * h);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]; const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)); const cur = px.subarray(y * stride, (y + 1) * stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0; let v = line[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[i] = v & 255;
    }
    prev = cur;
  }
  return { w, h, bpp, px };
}
function diff(A, B) {
  let changed = 0; const rows = new Map();
  for (let y = 0; y < A.h; y++) for (let x = 0; x < A.w; x++) {
    const i = (y * A.w + x) * A.bpp; const d = Math.abs(A.px[i] - B.px[i]) + Math.abs(A.px[i + 1] - B.px[i + 1]) + Math.abs(A.px[i + 2] - B.px[i + 2]);
    if (d > 24) { changed++; rows.set(y >> 5, (rows.get(y >> 5) || 0) + 1); }
  }
  return { changed, pct: +(100 * changed / (A.w * A.h)).toFixed(3), bands32px: Object.fromEntries([...rows].sort((a, b) => b[1] - a[1]).slice(0, 5)) };
}
const report = { fog: [], flicker: [] };
for (const [name, yaw] of [['turk', 270], ['taylor-south', 90], ['taylor-north', 180]]) {
  for (const fog of [true, false]) {
    await cmd({ yaw_deg: yaw, pitch_deg: 0, fog, hide_ui: true });
    await page.waitForTimeout(400);
    const file = `${out}/0b-${name}-fog${fog ? 'on' : 'off'}.png`;
    await page.screenshot({ path: file }); report.fog.push(file);
  }
}
for (const [name, yaw, pitch] of [['turk-road', 270, -14], ['taylor-road', 90, -14], ['turk-far', 270, 2]]) {
  await cmd({ yaw_deg: yaw, pitch_deg: pitch, fog: true, hide_ui: true });
  await page.waitForTimeout(500);
  const frames = [];
  for (let i = 0; i < 5; i++) { frames.push(decodePNG(await page.screenshot({ path: `${out}/flicker-${name}-${i}.png` }))); await page.waitForTimeout(90); }
  const diffs = []; for (let i = 1; i < frames.length; i++) diffs.push(diff(frames[0], frames[i]));
  report.flicker.push({ name, yaw, pitch, diffs });
}
// Same pose with the world frozen: tree sway and people animation keep running in main.gd,
// so a non-zero diff is only z-fighting if it sits on the road bands. Lift test on the ribbons:
await cmd({ yaw_deg: 270, pitch_deg: -14, lift: 0.02, lift_prefix: 'RouteRibbon' });
await cmd({ lift: 0.02, lift_prefix: 'TurkProtectedBikeLane' });
await page.waitForTimeout(400);
const f0 = decodePNG(await page.screenshot({ path: `${out}/flicker-lifted-0.png` })); await page.waitForTimeout(90);
const f1 = decodePNG(await page.screenshot({ path: `${out}/flicker-lifted-1.png` }));
report.lifted = diff(f0, f1);
await writeFile(`${out}/report-2.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 1));
await browser.close();
