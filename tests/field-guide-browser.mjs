import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Fresh contexts contain synthetic field records only. This test owns its server.
const playwright = process.env.PLAYWRIGHT_MODULE;
const { chromium, devices } = await import(playwright ? pathToFileURL(playwright).href : 'playwright');
const out = process.env.FIELD_GUIDE_EVIDENCE || 'artifacts/field-guide-browser';
await mkdir(out, { recursive: true });
const sourcePaths = ['scripts/serve-godot.mjs', 'tools/field-guide/index.html', 'godot/data/buildings.json', 'tests/field-guide-browser.mjs'];
const digest = b => createHash('sha256').update(b).digest('hex');
const sourceHashes = async () => Object.fromEntries(await Promise.all(sourcePaths.map(async p => [p, digest(await readFile(p))])));
const sourceBefore = await sourceHashes();
const html = await readFile('tools/field-guide/index.html');
const geometry = await readFile('godot/data/buildings.json');
const malformed = JSON.parse(geometry);
const footprintCount = malformed.buildings.length + malformed.wider_buildings.length;
assert.deepEqual(malformed.origin, { lat: 37.7832203, lon: -122.410784 }, 'Field Guide fallback origin matches this dataset');
malformed.buildings[0].height_m = null;
const freePort = await new Promise((resolve, reject) => {
  const socket = createServer();
  socket.once('error', reject);
  socket.listen(0, '127.0.0.1', () => {
    const port = socket.address().port;
    socket.close(() => resolve(port));
  });
});
const base = `http://127.0.0.1:${freePort}`;
const server = spawn(process.execPath, ['scripts/serve-godot.mjs'], {
  env: { ...process.env, GODOT_PORT: String(freePort) }, stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});
let serverLog = '';
server.stdout.on('data', x => { serverLog += x; });
server.stderr.on('data', x => { serverLog += x; });
const evidence = { cases: [], errors: [], external: [], sourceBefore };
function observe(page, pageErrors, requests = []) {
  page.on('request', request => {
    requests.push(request.url());
    if (!request.url().startsWith(base + '/') && !request.url().startsWith('data:') && !request.url().startsWith('blob:')) evidence.external.push(request.url());
  });
  page.on('pageerror', error => pageErrors.push(error.message));
}
const synthetic = JSON.stringify({
  activeStopIdx: 0,
  stops: { 'stop-01-comptons': {
    shots: {}, tags: ['Red Brick'], notes: 'Synthetic note retained',
    photos: [{ filename: 'synthetic.png', dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=' }],
  } },
  buildings: { 'synthetic-building': { tags: ['Cream Stucco'], facade: '#112233', trim: '#445566', photos: [] } },
  selectedBuildingId: null,
});
const key = 'tenderloin-redux.field-guide.v1';
let browser;
let baselineExport;
async function exportPack(page) {
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#exportJsonBtn').click()]);
  const chunks = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
try {
  for (let i = 0; i < 100 && !serverLog.includes('Godot study:'); i++) {
    if (server.exitCode !== null) throw new Error(`Owned preview exited: ${serverLog}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.match(serverLog, /Godot study:/, 'owned preview started');
  for (const path of ['/field-guide', '/browser']) {
    for (const method of ['GET', 'HEAD']) {
      const response = await fetch(base + path + '?probe=1', { method, redirect: 'manual' });
      assert.equal(response.status, 302);
      assert.equal(response.headers.get('location'), path + '/?probe=1');
      assert.equal(response.headers.get('cache-control'), 'no-store');
    }
  }
  const servedHtml = Buffer.from(await (await fetch(base + '/field-guide/')).arrayBuffer());
  const geoResponse = await fetch(base + '/field-guide/buildings.json');
  assert.equal(geoResponse.headers.get('cache-control'), 'no-store');
  const servedGeometry = Buffer.from(await geoResponse.arrayBuffer());
  assert.equal(digest(servedHtml), digest(html));
  assert.equal(digest(servedGeometry), digest(geometry));
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const [width, height, touch] of [[1100, 760, false], [390, 667, true], [320, 667, true]]) {
    const variants = ['normal', 'not-found', 'bad-json', 'empty', 'abort', 'mixed-invalid'];
    for (const variant of variants) {
      const context = await browser.newContext({
        ...(touch ? devices['Pixel 7'] : {}), viewport: { width, height }, hasTouch: touch,
        storageState: { cookies: [], origins: [{ origin: base, localStorage: [{ name: key, value: synthetic }] }] },
      });
      const page = await context.newPage();
      const requests = [], pageErrors = [];
      observe(page, pageErrors, requests);
      await context.tracing.start({ screenshots: false, snapshots: true });
      const tag = `${width}-${variant}`;
      try {
        if (variant !== 'normal') {
          await page.route('**/field-guide/buildings.json', async route => {
            if (variant === 'abort') return route.abort('failed');
            if (variant === 'not-found') return route.fulfill({ status: 404, body: 'not found' });
            if (variant === 'bad-json') return route.fulfill({ status: 200, body: '{invalid' });
            if (variant === 'empty') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ origin: { lat: 37.7832203, lon: -122.410784 }, buildings: [], wider_buildings: [] }) });
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(malformed) });
          });
        }
        await page.goto(base + '/field-guide?probe=1#kept', { waitUntil: 'networkidle' });
        assert.equal(page.url(), base + '/field-guide/?probe=1#kept');
        assert.equal(await page.evaluate(k => localStorage.getItem(k), key), synthetic);
        const summary = await page.locator('#progressSummary').innerText();
        const pill = await page.locator('#mapStatusPill').innerText();
        assert.equal(await page.locator('a').first().getAttribute('href'), '../');
        const unchangedExport = await exportPack(page);
        delete unchangedExport.exportedAt;
        if (!baselineExport) baselineExport = unchangedExport;
        else assert.deepEqual(unchangedExport, baselineExport, 'loading or failure preserves the complete synthetic export');
        if (variant === 'normal') {
          assert.ok(summary.includes(`${footprintCount} footprints loaded`));
          assert.ok(pill.includes(`${footprintCount} buildings`));
          const canvas = page.locator('#mapCanvas');
          await canvas.scrollIntoViewIfNeeded();
          // This interior pixel and ID are bound to the current measured dataset.
          const color = await canvas.evaluate(el => [...el.getContext('2d').getImageData(494, 306, 1, 1).data]);
          assert.deepEqual(color.slice(0, 3), [200, 125, 85], 'actual interior measured footprint pixel');
          const rect = await canvas.boundingBox();
          const x = rect.x + 493.883 * rect.width / 720;
          const y = rect.y + 305.913 * rect.height / 460;
          if (touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
          assert.match(await page.locator('#bldgTitle').innerText(), /201006\.0000957/);
          assert.equal(await page.locator('#bldgCard').isVisible(), true);
        } else {
          assert.match(summary, /map footprints unavailable/);
          assert.match(pill, /footprints unavailable/i);
          assert.ok(!summary.includes(`${footprintCount} footprints loaded`));
          const before = JSON.parse(await page.evaluate(k => localStorage.getItem(k), key));
          await page.locator('#shotsList input').first().check();
          const after = JSON.parse(await page.evaluate(k => localStorage.getItem(k), key));
          assert.equal(after.stops['stop-01-comptons'].shots[0], true);
          assert.equal(after.stops['stop-01-comptons'].notes, before.stops['stop-01-comptons'].notes);
          assert.deepEqual(after.stops['stop-01-comptons'].photos, before.stops['stop-01-comptons'].photos);
          assert.deepEqual(after.buildings, before.buildings);
          assert.match(await page.locator('#progressSummary').innerText(), /map footprints unavailable/);
          assert.match(await page.locator('#mapStatusPill').innerText(), /footprints unavailable/i);
        }
        const exported = await exportPack(page);
        assert.equal(exported.schema, 'tenderloin-redux.field-survey.v1');
        assert.equal(exported.stops[0].survey.notes, 'Synthetic note retained');
        assert.equal(exported.stops[0].survey.photos.length, 1);
        assert.equal(exported.buildings['synthetic-building'].facade, '#112233');
        assert.deepEqual(pageErrors, []);
        await page.screenshot({ path: `${out}/${tag}.png` });
        evidence.cases.push({ width, height, touch, variant, summary, pill, requests, pageErrors, exported: true });
      } catch (error) {
        evidence.errors.push({ tag, message: error.stack });
        await page.screenshot({ path: `${out}/${tag}-failure.png` }).catch(() => {});
        throw error;
      } finally {
        await context.tracing.stop({ path: `${out}/${tag}-trace.zip` });
        await context.close();
      }
    }
  }
  // A delayed response exposes the real loading state before geometry arrives.
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    const pageErrors = [];
    observe(page, pageErrors);
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    await page.route('**/field-guide/buildings.json', async route => {
      await gate;
      await route.fulfill({ status: 200, contentType: 'application/json', body: geometry });
    });
    await page.goto(base + '/field-guide/', { waitUntil: 'domcontentloaded' });
    assert.match(await page.locator('#mapStatusPill').innerText(), /loading/i);
    assert.ok(!(await page.locator('#progressSummary').innerText()).includes(`${footprintCount} footprints loaded`));
    assert.equal(await page.locator('#stopChips button').count(), 14);
    assert.ok(await page.locator('#shotsList input').count() > 0);
    await page.locator('#shotsList input').first().check();
    await page.locator('#notesInput').fill('Synthetic pending note');
    await page.locator('#notesInput').evaluate(el => { el.focus(); el.setSelectionRange(3, 3); window.__fieldPendingCheckbox = document.querySelector('#shotsList input'); });
    assert.match(await page.locator('#progressSummary').innerText(), /loading footprints/);
    release();
    await page.waitForFunction(count => document.querySelector('#progressSummary').textContent.includes(`${count} footprints loaded`), footprintCount);
    assert.equal(await page.locator('#shotsList input').first().isChecked(), true);
    assert.equal(JSON.parse(await page.evaluate(k => localStorage.getItem(k), key)).stops['stop-01-comptons'].shots[0], true);
    assert.deepEqual(await page.locator('#notesInput').evaluate(el => ({ focused: document.activeElement === el, start: el.selectionStart, end: el.selectionEnd, value: el.value, sameCheckbox: window.__fieldPendingCheckbox === document.querySelector('#shotsList input') })), { focused: true, start: 3, end: 3, value: 'Synthetic pending note', sameCheckbox: true });
    assert.deepEqual(pageErrors, []);
    await context.close();
    evidence.loadingStateVerified = true;
  }
  // Model a static project-base directory using the exact current HTML and data.
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    const pageErrors = [];
    observe(page, pageErrors);
    await page.route('**/project/field-guide/', route => route.fulfill({ status: 200, contentType: 'text/html', body: html }));
    await page.route('**/project/field-guide/buildings.json', route => route.fulfill({ status: 200, contentType: 'application/json', body: geometry }));
    await page.goto(base + '/project/field-guide/', { waitUntil: 'networkidle' });
    assert.ok((await page.locator('#progressSummary').innerText()).includes(`${footprintCount} footprints loaded`));
    assert.equal(await page.locator('a').first().evaluate(a => a.href), base + '/project/');
    assert.deepEqual(pageErrors, []);
    await context.close();
    evidence.projectBaseSlashVerified = true;
  }
  // The original browser app must load its original relative assets after canonicalization.
  const context = await browser.newContext();
  const page = await context.newPage();
  const browserErrors = [];
  observe(page, browserErrors);
  const bad = [];
  page.on('response', response => { if (response.status() >= 400 && /\/(style\.css|game\.js|icon\.svg)$/.test(response.url())) bad.push(response.url()); });
  await page.goto(base + '/browser?probe=2#kept', { waitUntil: 'networkidle' });
  assert.equal(page.url(), base + '/browser/?probe=2#kept');
  assert.deepEqual(bad, []);
  assert.deepEqual(browserErrors, []);
  await context.close();
  assert.deepEqual(evidence.external, []);
  evidence.sourceAfter = await sourceHashes();
  assert.deepEqual(evidence.sourceAfter, sourceBefore);
  evidence.ok = true;
} catch (error) {
  evidence.ok = false;
  evidence.fatal = error.stack;
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill();
  evidence.serverLog = serverLog;
  await writeFile(`${out}/result.json`, JSON.stringify(evidence, null, 2));
}
console.log(JSON.stringify({ ok: evidence.ok, cases: evidence.cases.length, errors: evidence.errors, external: evidence.external }));
