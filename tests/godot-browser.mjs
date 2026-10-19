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
    page.on('console', m => {
      if (m.type() === 'error') errors.push(m.text());
      if (m.type() === 'warning' && /sample|playback.?type|AudioStreamGenerator/i.test(m.text())) errors.push(`audio-warning: ${m.text()}`);
    });
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
    // Visit Thanh on the west end of the block (Mason & Golden Gate) via Digit5 before heading east along Turk St
    await page.keyboard.press('Digit5');
    await page.waitForFunction(() => {
      const raw = window.localStorage.getItem('tenderloin-redux.godot.save.v1');
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.visited_neighbors) && parsed.visited_neighbors.includes('thanh');
    }, null, { timeout: 35000 });
    // Press KeyE to walk to Celeste and talk upon arrival (which saves celeste_talk_count >= 1 and opens MuralPanel)
    await page.keyboard.press('KeyE');
    await page.waitForFunction(() => {
      const raw = window.localStorage.getItem('tenderloin-redux.godot.save.v1');
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return parsed.celeste_talk_count >= 1;
    }, null, { timeout: 35000 });
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
    // Press KeyR to walk to Rook on Turk Street and run soundcheck on arrival
    await page.keyboard.press('KeyR');
    await page.waitForFunction(() => {
      const raw = window.localStorage.getItem('tenderloin-redux.godot.save.v1');
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return parsed.rook_soundcheck_done === true;
    }, null, { timeout: 30000 });
    await page.waitForTimeout(200);
    // Press KeyK to start explicit procedural sketch playback on Rook's speaker
    await page.keyboard.press('KeyK');
    await page.waitForTimeout(250);
    const musicShot = await page.screenshot({ path: `artifacts/godot-${size.width}-music.png` });
    assert.notDeepEqual(muralShot, musicShot, `Rook soundcheck and MusicPanel playback must visibly update canvas at ${size.width}`);
    // Verify hidden Web audio file picker input and test local WAV audition + corrupt WAV/MP3/OGG rejection via Uint8Array Web bridge
    const pickerOk = await page.evaluate(() => {
      const el = document.getElementById('tenderloin-godot-audio-input');
      if (!el || el.type !== 'file' || !el.accept.includes('.wav') || typeof window.__tenderloinQueueLocalAudioBytes !== 'function' || typeof window.__tenderloinQueueLocalAudioBase64 !== 'function') return false;
      const sr = 22050, samples = 2205, dataSize = samples * 2;
      const buf = new ArrayBuffer(44 + dataSize);
      const v = new DataView(buf);
      const writeAscii = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
      writeAscii(0, 'RIFF');
      v.setUint32(4, 36 + dataSize, true);
      writeAscii(8, 'WAVE');
      writeAscii(12, 'fmt ');
      v.setUint32(16, 16, true);
      v.setUint16(20, 1, true);
      v.setUint16(22, 1, true);
      v.setUint32(24, sr, true);
      v.setUint32(28, sr * 2, true);
      v.setUint16(32, 2, true);
      v.setUint16(34, 16, true);
      writeAscii(36, 'data');
      v.setUint32(40, dataSize, true);
      for (let i = 0; i < samples; i++) {
        v.setInt16(44 + i * 2, Math.round(Math.sin((2 * Math.PI * 330 * i) / sr) * 12000), true);
      }
      return window.__tenderloinQueueLocalAudioBytes('suno-browser-test.wav', new Uint8Array(buf), '');
    });
    assert.equal(pickerOk, true, 'Web local audio picker input and Uint8Array bridge must be initialized');
    await page.waitForTimeout(300);
    const auditionShot = await page.screenshot();
    assert.notDeepEqual(musicShot, auditionShot, `Local WAV audition must visibly update MusicPanel status at ${size.width}`);
    await page.evaluate(() => window.__tenderloinQueueLocalAudioBase64('corrupt.wav', window.btoa('not-a-valid-riff-wav'), ''));
    await page.waitForTimeout(220);
    const errorShot = await page.screenshot();
    assert.notDeepEqual(auditionShot, errorShot, `Corrupt WAV must visibly display decode error message at ${size.width}`);
    await page.evaluate(() => {
      const id3 = new Uint8Array([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66]);
      return window.__tenderloinQueueLocalAudioBytes('corrupt-id3.mp3', id3, '');
    });
    await page.waitForTimeout(180);
    await page.evaluate(() => {
      const oggs = new Uint8Array(36);
      oggs[0] = 0x4F; oggs[1] = 0x67; oggs[2] = 0x67; oggs[3] = 0x53;
      for (let i = 4; i < 36; i++) oggs[i] = 0x42;
      return window.__tenderloinQueueLocalAudioBytes('corrupt-oggs.ogg', oggs, '');
    });
    await page.waitForTimeout(180);
    await page.keyboard.press('KeyU');
    await page.waitForTimeout(200);
    // Pause music playback before completing the block to prove sound-independent block opening in Web export
    await page.keyboard.press('KeyK');
    await page.waitForTimeout(150);
    // Visit remaining neighbor Dez (just east of Rook on Turk St) via Digit4 and open the block gathering via KeyO
    await page.keyboard.press('Digit4');
    await page.waitForFunction(() => {
      const raw = window.localStorage.getItem('tenderloin-redux.godot.save.v1');
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.visited_neighbors) && parsed.visited_neighbors.includes('dez');
    }, null, { timeout: 25000 });
    await page.keyboard.press('KeyO');
    await page.waitForFunction(() => {
      const raw = window.localStorage.getItem('tenderloin-redux.godot.save.v1');
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return parsed.block_opened === true;
    }, null, { timeout: 10000 });
    await page.waitForTimeout(250);
    const blockShot = await page.screenshot({ path: `artifacts/godot-${size.width}-block.png` });
    assert.notDeepEqual(musicShot, blockShot, `Opening the Turk St block gathering must visibly render BlockPanel and 3D BlockGatheringBanner at ${size.width}`);
    // Round 6: Press KeyJ to walk to / read Compton's Corner plaque at Turk & Taylor
    await page.keyboard.press('KeyJ');
    await page.waitForFunction(() => {
      const raw = window.localStorage.getItem('tenderloin-redux.godot.save.v1');
      if (!raw) return false;
      return JSON.parse(raw).history_read === true;
    }, null, { timeout: 30000 });
    // Press KeyH to walk 4 blocks west along Turk Street (crossing Jones and Leavenworth) to Former Black Hawk Jazz Club at Turk & Hyde
    await page.keyboard.press('KeyH');
    await page.waitForFunction(() => {
      const raw = window.localStorage.getItem('tenderloin-redux.godot.save.v1');
      if (!raw) return false;
      return JSON.parse(raw).blackhawk_discovered === true;
    }, null, { timeout: 40000 });
    await page.waitForTimeout(250);
    const blackhawkShot = await page.screenshot({ path: `artifacts/godot-${size.width}-blackhawk.png` });
    assert.notDeepEqual(blockShot, blackhawkShot, `Walking west along Turk St to Black Hawk at Turk & Hyde must visibly update view at ${size.width}`);
    // Press KeyC to toggle Transgender Cultural District boundary (DataSF 5xmc-5bjj) and KeyL for wide 188-building Tenderloin overview
    await page.keyboard.press('KeyC');
    await page.waitForFunction(() => {
      const raw = window.localStorage.getItem('tenderloin-redux.godot.save.v1');
      if (!raw) return false;
      return JSON.parse(raw).district_boundary_visible === false;
    }, null, { timeout: 10000 });
    await page.keyboard.press('KeyL');
    await page.waitForTimeout(300);
    const wideShot = await page.screenshot({ path: `artifacts/godot-${size.width}-wide.png` });
    assert.notDeepEqual(before, wideShot, `Wide 188-building Tenderloin overview must visibly differ from single-block overview at ${size.width}`);
    // Verify Web DOM aria-live polite status and summary regions
    const a11yDom = await page.evaluate(() => {
      const live = document.getElementById('godot-a11y-status');
      const summary = document.getElementById('godot-a11y-summary');
      const saveInput = document.getElementById('tenderloin-godot-save-input');
      return {
        liveRole: live ? live.getAttribute('role') : null,
        livePolite: live ? live.getAttribute('aria-live') : null,
        liveText: live ? live.textContent : '',
        summaryRole: summary ? summary.getAttribute('role') : null,
        summaryText: summary ? summary.textContent : '',
        savePickerReady: Boolean(saveInput && saveInput.type === 'file' && saveInput.accept.includes('.json') && typeof window.__tenderloinQueueBrowserSaveJson === 'function'),
        snapshot: window.__tenderloinGodotA11ySnapshot || null
      };
    });
    assert.equal(a11yDom.liveRole, 'status', 'DOM #godot-a11y-status must have role="status"');
    assert.equal(a11yDom.livePolite, 'polite', 'DOM #godot-a11y-status must have aria-live="polite"');
    assert.ok((a11yDom.snapshot?.seq || 0) > 0 && a11yDom.liveText.includes('188 city footprints across 7 streets'), 'DOM #godot-a11y-status must announce wide 188-footprint Tenderloin overview');
    assert.equal(a11yDom.summaryRole, 'region', 'DOM #godot-a11y-summary must have role="region"');
    assert.ok(a11yDom.summaryText.includes('Neighbors 5/5') && a11yDom.summaryText.includes('Mural 3/3') && a11yDom.summaryText.includes('Block Opened') && a11yDom.summaryText.includes("Compton's Read") && a11yDom.summaryText.includes('Black Hawk Found') && a11yDom.summaryText.includes('District Hidden'), 'DOM #godot-a11y-summary must reflect 5/5 neighbors, 3/3 mural, Block Opened, Compton\'s Read, Black Hawk Found, and District Hidden');
    assert.equal(a11yDom.savePickerReady, true, 'Web JSON save file picker fallback input and queue bridge must be initialized');
    assert.equal(a11yDom.snapshot?.music_playing, false, 'Block opening and wider Tenderloin completion must succeed with music_playing === false (sound-independent completion)');
    assert.equal(a11yDom.snapshot?.total_buildings, 188, 'A11y snapshot must report 188 total measured Tenderloin buildings');
    assert.equal(a11yDom.snapshot?.wider_buildings_count, 130, 'A11y snapshot must report 130 wider Tenderloin buildings');
    const storageBeforeReload = await page.evaluate(() => ({
      godotSave: window.localStorage.getItem('tenderloin-redux.godot.save.v1'),
      browserSave: window.localStorage.getItem('tenderloin-redux.save.v1')
    }));
    // Verify explicit opt-in browser save import (KeyI) rejects BROWSER_SAVE_SENTINEL without overwriting it or mutating Godot save
    await page.keyboard.press('KeyI');
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.browser_import_status === 'error', null, { timeout: 10000 });
    const afterSentinelImportAttempt = await page.evaluate(() => ({
      browserSave: window.localStorage.getItem('tenderloin-redux.save.v1'),
      godotSave: window.localStorage.getItem('tenderloin-redux.godot.save.v1'),
      snapshot: window.__tenderloinGodotA11ySnapshot
    }));
    assert.equal(afterSentinelImportAttempt.browserSave, BROWSER_SAVE_SENTINEL, 'Rejected KeyI import must leave tenderloin-redux.save.v1 untouched');
    assert.equal(afterSentinelImportAttempt.godotSave, storageBeforeReload.godotSave, 'Rejected KeyI import must leave tenderloin-redux.godot.save.v1 byte-for-byte identical');
    assert.equal(afterSentinelImportAttempt.snapshot?.browser_import_status, 'error', 'Sentinel without core object must report browser_import_status === error');
    assert.equal(afterSentinelImportAttempt.snapshot?.block_opened, true, 'Rejected browser save import must preserve existing Godot block_opened state');
    assert.equal(storageBeforeReload.browserSave, BROWSER_SAVE_SENTINEL, 'Godot Web export must preserve browser game tenderloin-redux.save.v1 sentinel');
    assert.ok(storageBeforeReload.godotSave, `Godot Web export must persist to tenderloin-redux.godot.save.v1 at ${size.width}`);
    assert.ok(!storageBeforeReload.godotSave.includes('suno-browser-test.wav'), 'Local Suno audio filename must stay tab-local and never persist in save JSON');
    const parsedSave = JSON.parse(storageBeforeReload.godotSave);
    assert.equal(parsedSave.schema, 'tenderloin-redux.godot.save');
    assert.equal(parsedSave.version, 1);
    assert.ok(parsedSave.save_seq >= 12, 'save_seq must increment across talk, 3 motif placements, palette change, Rook soundcheck, Dez/Thanh visits, block opening, Compton\'s Corner, Black Hawk, and district boundary toggle');
    assert.equal(parsedSave.celeste_talk_count, 1);
    assert.equal(parsedSave.mural_palette, 'sunset');
    assert.equal(parsedSave.rook_soundcheck_done, true);
    assert.equal(parsedSave.block_opened, true);
    assert.equal(parsedSave.history_read, true);
    assert.equal(parsedSave.blackhawk_discovered, true);
    assert.equal(parsedSave.district_boundary_visible, false);
    assert.deepEqual(parsedSave.visited_neighbors, ['bea', 'celeste', 'dez', 'rook', 'thanh']);
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
    assert.equal(postReloadSave.rook_soundcheck_done, true, 'Post-reload save must preserve restored rook_soundcheck_done');
    assert.equal(postReloadSave.block_opened, true, 'Post-reload save must preserve restored block_opened');
    assert.equal(postReloadSave.history_read, true, 'Post-reload save must preserve restored history_read');
    assert.equal(postReloadSave.blackhawk_discovered, true, 'Post-reload save must preserve restored blackhawk_discovered');
    assert.equal(postReloadSave.district_boundary_visible, false, 'Post-reload save must preserve restored district_boundary_visible');
    assert.deepEqual(postReloadSave.mural_placements, parsedSave.mural_placements, 'Post-reload save must preserve all 3 restored motif placements');
    // Seed a valid public/core.js v1 save with ocean palette, press KeyI to import explicitly, and verify read-only preservation
    const seededBrowserSave = JSON.stringify({
      version: 1,
      core: {
        greeted: true,
        layout: 'table',
        furniture: { table: { col: 1, row: 0 }, seats: { col: 4, row: 0 }, speaker: { col: 1, row: 3 } },
        litter: ['cup', 'offcuts', 'wrapper'],
        mural: { sun: { col: 0, row: 0 }, wave: { col: 2, row: 1 }, rise: { col: 4, row: 2 } },
        palette: 'ocean',
        soundcheck: true,
        opened: true,
        history: true,
        blackhawk: true
      }
    });
    await page.evaluate((raw) => window.localStorage.setItem('tenderloin-redux.save.v1', raw), seededBrowserSave);
    await page.keyboard.press('KeyI');
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.browser_import_status === 'imported', null, { timeout: 10000 });
    const afterValidImport = await page.evaluate(() => ({
      browserSave: window.localStorage.getItem('tenderloin-redux.save.v1'),
      godotSave: JSON.parse(window.localStorage.getItem('tenderloin-redux.godot.save.v1') || '{}'),
      snapshot: window.__tenderloinGodotA11ySnapshot
    }));
    assert.equal(afterValidImport.browserSave, seededBrowserSave, 'Explicit KeyI import must never mutate tenderloin-redux.save.v1');
    assert.equal(afterValidImport.godotSave.mural_palette, 'ocean', 'Explicit KeyI import must map browser v1 ocean palette into Godot save');
    assert.equal(afterValidImport.godotSave.block_opened, true, 'Explicit KeyI import of complete browser v1 save must set block_opened === true');
    assert.equal(afterValidImport.godotSave.history_read, true, 'Explicit KeyI import must map browser v1 history flag');
    assert.equal(afterValidImport.godotSave.blackhawk_discovered, true, 'Explicit KeyI import must map browser v1 blackhawk flag');
    // Queue a partial browser save via the cross-origin .json file picker bridge and verify monotonic merge preserves 5/5 neighbors, 3/3 ocean mural, block_opened, history_read, and blackhawk_discovered
    const prevSaveSeq = afterValidImport.godotSave.save_seq;
    await page.evaluate(() => window.__tenderloinQueueBrowserSaveJson(JSON.stringify({
      version: 1,
      core: { greeted: true, layout: 'table', furniture: {}, litter: [], mural: { sun: { col: 1, row: 0 } }, palette: 'garden', soundcheck: false, opened: false, history: false, blackhawk: false }
    }), ''));
    await page.waitForFunction((seq) => {
      const raw = window.localStorage.getItem('tenderloin-redux.godot.save.v1');
      if (!raw) return false;
      return JSON.parse(raw).save_seq > seq;
    }, prevSaveSeq, { timeout: 10000 });
    const afterFileBridgeMerge = await page.evaluate(() => JSON.parse(window.localStorage.getItem('tenderloin-redux.godot.save.v1') || '{}'));
    assert.equal(afterFileBridgeMerge.mural_palette, 'ocean', 'File picker bridge monotonic merge must preserve 3/3 ocean mural over 1/3 partial import');
    assert.equal(afterFileBridgeMerge.block_opened, true, 'File picker bridge monotonic merge must preserve block_opened state');
    assert.equal(afterFileBridgeMerge.history_read, true, 'File picker bridge monotonic merge must preserve history_read state');
    assert.equal(afterFileBridgeMerge.blackhawk_discovered, true, 'File picker bridge monotonic merge must preserve blackhawk_discovered state');
    runs.push({ viewport: size, overviewBytes: before.length, selectedBytes: after.length, neighborBytes: neighbor.length, muralBytes: muralShot.length, musicBytes: musicShot.length, blockBytes: blockShot.length, blackhawkBytes: blackhawkShot.length, wideBytes: wideShot.length, keyboardActivationVerified: true, neighborWalkVerified: true, muralSaveReloadVerified: true, rookMusicAuditionVerified: true, blockCompletionVerified: true, widerTenderloinVerified: true, browserSaveImportVerified: true, domA11yLiveVerified: true });
    await context.close();
  }
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  await writeFile('artifacts/godot-browser.json', JSON.stringify({ runs, errors, external, limit: 'Pixel-change, isolated Godot localStorage save/reload, opt-in browser v1 save import, Web local WAV audition, DOM aria-live status bridge, wider 188-building Tenderloin exploration, and driver-inspected screenshots, not full canvas button DOM/screen-reader or physical-phone acceptance.' }, null, 2));
  console.log(JSON.stringify({ runs, errors, external }));
} finally { await browser.close(); }
