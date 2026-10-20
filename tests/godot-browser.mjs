import { mkdir, stat, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { initialState, applyAction, serializeSave } from '../public/core.js';
import { postcardSVG } from '../public/keepsake.js';
import { programmeSVG } from '../public/programme.js';
import { tilePanelSVG } from '../public/hosting.js';
import { civicPlanSVG } from '../public/civic.js';
import { filmFrameSVG } from '../public/film.js';
const [pckStat, ...sourceStats] = await Promise.all([
  stat('artifacts/godot-web/index.pck'),
  stat('godot/main.gd'),
  stat('godot/main.tscn'),
  stat('godot/project.godot'),
  stat('godot/export_presets.cfg'),
  stat('godot/data/buildings.json'),
  stat('godot/data/neighborhood_voices.json'),
  stat('godot/ENGINE_LICENSE.txt')
]);
for (const srcStat of sourceStats) {
  assert.ok(pckStat.mtimeMs >= srcStat.mtimeMs, 'artifacts/godot-web/index.pck is older than Godot project sources; run npm run godot:export first');
}
assert.ok(pckStat.size > 0 && pckStat.size <= 2 * 1024 * 1024, `artifacts/godot-web/index.pck (${pckStat.size} bytes) must stay within 2 MB release budget`);
const BROWSER_SAVE_SENTINEL = JSON.stringify({ schema: 'tenderloin-redux.save', version: 1, sentinel: 'preserve-browser-save-v1' });
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const base = 'http://127.0.0.1:' + (process.env.GODOT_PORT || 4174) + '/';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [], external = [], runs = [];
let latestPage = null;
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
    latestPage = page;
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => {
      if (m.type() === 'error') errors.push(m.text());
      if (m.type() === 'warning' && /sample|playback.?type|AudioStreamGenerator/i.test(m.text())) errors.push(`audio-warning: ${m.text()}`);
    });
    await page.goto(base);
    await page.locator('#status').waitFor({ state: 'hidden', timeout: 60000 });
    await page.waitForTimeout(1200);
    async function clickHeaderControl(key) {
      const prev = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot.ui_frame);
      await page.waitForFunction(frame => window.__tenderloinGodotA11ySnapshot?.ui_frame > frame, prev);
      const snap = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
      const control = snap[key];
      assert.ok(control?.visible && control.width >= 44 && control.height >= 44, `${key} has a visible 44px target`);
      assert.ok(control.x >= 0 && control.y >= 0 && control.x + control.width <= snap.viewport_width + 1 && control.y + control.height <= snap.viewport_height + 1, `${key} fits viewport`);
      const canvas = await page.locator('#canvas').boundingBox();
      await page.mouse.click(canvas.x + (control.x + control.width / 2) * canvas.width / snap.viewport_width, canvas.y + (control.y + control.height / 2) * canvas.height / snap.viewport_height);
    }
    const startup = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
    assert.equal(startup.reward_sounds_enabled, true);
    assert.equal(startup.reward_audio_unlocked, false);
    assert.equal(startup.reward_sound_count, 0);
    assert.equal(startup.reward_audio_playing, false);
    assert.equal(startup.header_details_expanded, false);
    assert.ok(startup.header_control.height <= 130, 'compact header leaves room for the game');
    await page.mouse.move(size.width / 2, 30);
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(600);
    assert.equal((await page.evaluate(() => window.__tenderloinGodotA11ySnapshot)).reward_audio_unlocked, false, 'wheel is not a sound-unlock gesture');
    await clickHeaderControl('start_control');
    await page.waitForFunction(() => !window.__tenderloinGodotA11ySnapshot?.in_overview && window.__tenderloinGodotA11ySnapshot?.camera_view_size <= 58);
    const oriented = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
    assert.equal(oriented.reward_audio_unlocked, true);
    assert.equal(oriented.music_playing, false);
    assert.ok(oriented.cutaway_additions > 0, 'newer foreground buildings must fade for the starting character');
    assert.ok(oriented.player_screen.x >= oriented.play_area.x && oriented.player_screen.x <= oriented.play_area.x + oriented.play_area.width && oriented.player_screen.y >= oriented.play_area.y && oriented.player_screen.y <= oriented.play_area.y + oriented.play_area.height, 'Start frames the actual avatar inside the playable scene');
    assert.match(oriented.progress_text, /Sparks: 0 · Keepsakes: 0\/10/);
    await page.screenshot({ path: `artifacts/godot-${size.width}-start-oriented.png` });
    function assertGrounded(snap, context) {
      const p = snap.player_grounding;
      assert.ok(Math.abs(p.x - p.shadow_x) < 0.001 && Math.abs(p.z - p.shadow_z) < 0.001, `${context}: shadow stays beneath the actual player`);
      assert.ok(p.shadow_y >= 0.07 && p.shadow_y < 0.09, `${context}: shadow clears the route ribbon without floating`);
    }
    assertGrounded(oriented, 'daylight');
    const saveBeforeLight = await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1'));
    await page.keyboard.press('Shift+KeyL');
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.evening_mode === true);
    assertGrounded(await page.evaluate(() => window.__tenderloinGodotA11ySnapshot), 'evening');
    await page.screenshot({ path: `artifacts/godot-${size.width}-character-evening.png` });
    await page.keyboard.press('Shift+KeyL');
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.evening_mode === false);
    assert.equal(await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1')), saveBeforeLight, 'character lighting comparison leaves save untouched');
    await clickHeaderControl('info_control');
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.header_details_expanded === true);
    await page.waitForTimeout(150);
    const details = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
    assert.ok(details.header_control.height <= startup.header_control.height + 100, 'expanded details stay within a bounded scroll area');
    await page.screenshot({ path: `artifacts/godot-${size.width}-header-info.png` });
    await clickHeaderControl('info_control');
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.header_details_expanded === false);
    await page.mouse.click(size.width * (size.width < 600 ? .75 : .50), size.height - (size.width < 600 ? 148 : 98));
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.in_wide_overview === true);
    const before = await page.screenshot({ path: `artifacts/godot-${size.width}-overview.png` });
    await page.mouse.click(size.width * (size.width < 600 ? .25 : .17), size.height - (size.width < 600 ? 148 : 98));
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.header_details_expanded === true, null, { timeout: 5000 });
    await clickHeaderControl('info_control');
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.header_details_expanded === false);
    // Native Godot Control buttons are canvas pixels, not DOM accessibility nodes.
    // Find Me is button index 2: desktop right/top row; phone left/middle row.
    // Grid: 12px side/bottom margin, 50px buttons, 4px row gap, 2/3 columns.
    await page.mouse.click(size.width * (size.width < 600 ? .25 : .83), size.height - 98);
    await page.waitForTimeout(300);
    const after = await page.screenshot({ path: `artifacts/godot-${size.width}-find-me.png` });
    assert.notDeepEqual(before, after, `Find Me returns from the Tenderloin map at ${size.width}`);
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.camera_view_size === 45);
    await page.mouse.click(size.width * (size.width < 600 ? .75 : .17), size.height - (size.width < 600 ? 98 : 38));
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.camera_view_size < 45);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    const keyboard = await page.screenshot();
    await page.waitForFunction(() => Math.abs(window.__tenderloinGodotA11ySnapshot?.camera_view_size - 45) < 0.01);
    assert.notDeepEqual(before, keyboard, 'Zoom in followed by Tab/Enter on Zoom out retains the close walking view');
    // Click "Walk to neighbor" (button index 5: bottom-right of 3x2 desktop or 2x3 phone grid)
    await page.mouse.click(size.width * (size.width < 600 ? .75 : .83), size.height - 38);
    await page.waitForTimeout(900);
    const neighbor = await page.screenshot({ path: `artifacts/godot-${size.width}-neighbor.png` });
    assert.notDeepEqual(keyboard, neighbor, `Walk to neighbor must visibly advance player/camera at ${size.width}`);
    // Close the conversation through normal input so feet are visible in motion.
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.active_panel === 'none');
    const beforeThanh = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
    const saveBeforeStop = await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1'));
    // Preserve the established Thanh approach used by the lighting regression.
    await page.keyboard.press('Digit5');
    await page.waitForFunction(previous => {
      const s = window.__tenderloinGodotA11ySnapshot, p = s?.player_grounding;
      return s?.ui_frame > previous.frame && p?.path_active && p.stride > 0.5 && Math.hypot(p.x - previous.x, p.z - previous.z) > 0.1;
    }, { frame: beforeThanh.ui_frame, x: beforeThanh.player_grounding.x, z: beforeThanh.player_grounding.z });
    const walkingGrounding = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
    assertGrounded(walkingGrounding, 'walking');
    // PNGs are visual evidence near the asserted frame, not atomic frame captures.
    await page.screenshot({ path: `artifacts/godot-${size.width}-character-walking.png` });
    const activeWalk = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
    assert.equal(activeWalk.walk_control_text, 'Stop Walking');
    assert.ok(Math.hypot(activeWalk.player_grounding.x - 11.10, activeWalk.player_grounding.z - 24.97) > 25, 'Thanh remains over 25m away before the Stop gesture, avoiding an arrival race');
    const stop = activeWalk.walk_control;
    assert.ok(stop.visible && stop.width >= 44 && stop.height >= 44 && stop.x >= 0 && stop.y >= 0 && stop.x + stop.width <= activeWalk.viewport_width + 1 && stop.y + stop.height <= activeWalk.viewport_height + 1, 'Stop Walking stays visible and tappable');
    const stopCanvas = await page.locator('#canvas').boundingBox();
    await page.mouse.move(stopCanvas.x + (stop.x + stop.width / 2) * stopCanvas.width / activeWalk.viewport_width, stopCanvas.y + (stop.y + stop.height / 2) * stopCanvas.height / activeWalk.viewport_height);
    await page.mouse.down();
    await page.waitForFunction(frame => {
      const s = window.__tenderloinGodotA11ySnapshot;
      return s?.ui_frame > frame && !s.player_grounding.path_active && s.walk_control_text === 'Walk & Talk (Next)' && s.announcement.startsWith('Walking stopped.');
    }, activeWalk.ui_frame);
    const stoppedWalk = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
    // Hold through multiple updates, then release: a Stop press must not become Next.
    await page.waitForFunction(frame => window.__tenderloinGodotA11ySnapshot?.ui_frame > frame + 3, stoppedWalk.ui_frame);
    await page.mouse.up();
    await page.waitForTimeout(900);
    const steadyWalk = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
    assert.ok(steadyWalk.ui_frame > stoppedWalk.ui_frame + 3 && steadyWalk.player_grounding.stride < 0.1, 'fresh stopped frames settle the walking animation');
    assert.equal(steadyWalk.player_grounding.path_active, false);
    assert.equal(steadyWalk.walk_control_text, 'Walk & Talk (Next)');
    assert.ok(Math.hypot(steadyWalk.player_grounding.x - stoppedWalk.player_grounding.x, steadyWalk.player_grounding.z - stoppedWalk.player_grounding.z) < 0.001, 'stopped player stays still after release');
    assert.equal(steadyWalk.visited_count, beforeThanh.visited_count, 'stopping does not mark the neighbor visited');
    assert.equal(steadyWalk.reward_sound_count, beforeThanh.reward_sound_count, 'stopping does not award or play a reward');
    assert.equal(await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1')), saveBeforeStop, 'stop leaves progress save unchanged');
    assert.equal(await page.evaluate(() => localStorage.getItem('tenderloin-redux.save.v1')), BROWSER_SAVE_SENTINEL, 'stop preserves legacy save');
    await page.screenshot({ path: `artifacts/godot-${size.width}-walking-stopped.png` });
    await page.keyboard.press('Digit5');
    await page.waitForFunction(previous => {
      const s = window.__tenderloinGodotA11ySnapshot, p = s?.player_grounding;
      return s?.ui_frame > previous.frame && p?.path_active && s.walk_control_text === 'Stop Walking' && Math.hypot(p.x - previous.x, p.z - previous.z) > 0.1;
    }, { frame: steadyWalk.ui_frame, x: steadyWalk.player_grounding.x, z: steadyWalk.player_grounding.z });
    await page.keyboard.press('Shift+KeyL');
    await page.waitForFunction(() => {
      const s = window.__tenderloinGodotA11ySnapshot;
      return s?.evening_mode && s.player_grounding.nearest_light_pool_distance < 1.3;
    }, null, { timeout: 15000 });
    assertGrounded(await page.evaluate(() => window.__tenderloinGodotA11ySnapshot), 'evening light pool');
    await page.screenshot({ path: `artifacts/godot-${size.width}-character-light-pool.png` });
    await page.keyboard.press('Shift+KeyL');
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.evening_mode === false);
    await page.waitForFunction(() => {
      const raw = window.localStorage.getItem('tenderloin-redux.godot.save.v1');
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.visited_neighbors) && parsed.visited_neighbors.includes('thanh');
    }, null, { timeout: 35000 });
    await page.waitForFunction(() => {
      const p = window.__tenderloinGodotA11ySnapshot?.player_grounding;
      return p && !p.path_active && p.stride < 0.1;
    });
    assertGrounded(await page.evaluate(() => window.__tenderloinGodotA11ySnapshot), 'arrived');
    assert.equal((await page.evaluate(() => window.__tenderloinGodotA11ySnapshot)).walk_control_text, 'Walk & Talk (Next)', 'arrival restores normal walking action');
    await page.keyboard.press('KeyF');
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.active_panel === 'none' && window.__tenderloinGodotA11ySnapshot?.overlays.speech.anchor === '');
    await page.screenshot({ path: `artifacts/godot-${size.width}-character-arrived.png` });
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
    // Round 7: Press KeyY (5x) to take keepsake photo with consenting neighbors, start packing, and return all 3 borrowed neighbor loans
    for (let yStep = 0; yStep < 5; yStep++) {
      await page.keyboard.press('KeyY');
      await page.waitForTimeout(80);
    }
    await page.waitForFunction(() => {
      const raw = window.localStorage.getItem('tenderloin-redux.godot.save.v1');
      if (!raw) return false;
      const ep = JSON.parse(raw).epilogue;
      return ep && ep.photo?.status === 'taken' && ep.packing === true && Array.isArray(ep.returned) && ep.returned.length === 3;
    }, null, { timeout: 10000 });
    // Round 9: Verify real <a download> path at 1100px, and byte-for-byte SVG parity against public/keepsake.js across all viewports
    if (size.width === 1100) {
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
      await page.keyboard.press('Shift+KeyY');
      const download = await downloadPromise;
      assert.equal(download.suggestedFilename(), 'tenderloin-redux-godot-afternoon.svg', 'Real browser download event must suggest tenderloin-redux-godot-afternoon.svg');
      await page.evaluate(() => { window.__tenderloinSuppressDownload = true; });
    } else {
      await page.evaluate(() => { window.__tenderloinSuppressDownload = true; });
      await page.keyboard.press('Shift+KeyY');
    }
    await page.waitForFunction(() => Boolean(window.__tenderloinLastExportedSvg?.svg), null, { timeout: 10000 });
    const exportedKeepsake = await page.evaluate(() => ({
      exported: window.__tenderloinLastExportedSvg,
      snapshotExported: window.__tenderloinGodotA11ySnapshot?.keepsake_exported,
      saveRaw: window.localStorage.getItem('tenderloin-redux.godot.save.v1')
    }));
    const savedPhotoForParity = JSON.parse(exportedKeepsake.saveRaw).epilogue.photo;
    assert.equal(exportedKeepsake.exported?.filename, 'tenderloin-redux-godot-afternoon.svg', 'Shift+KeyY must export tenderloin-redux-godot-afternoon.svg');
    assert.equal(exportedKeepsake.exported?.svg, postcardSVG(savedPhotoForParity), 'Exported Godot keepsake SVG must be 100% byte-for-byte identical to public/keepsake.js postcardSVG()');
    assert.equal(exportedKeepsake.exported?.bytes, Buffer.byteLength(exportedKeepsake.exported.svg, 'utf8'), 'Exported keepsake SVG byte count must match UTF-8 byte length');
    assert.equal(exportedKeepsake.snapshotExported, true, 'A11y snapshot must report keepsake_exported === true after Shift+KeyY');
    // Press KeyZ (6x) to publish the 4-segment afternoon programme, start hosting, and complete all 4 hosted segments
    for (let zStep = 0; zStep < 6; zStep++) {
      await page.keyboard.press('KeyZ');
      await page.waitForTimeout(80);
    }
    await page.waitForFunction(() => {
      const raw = window.localStorage.getItem('tenderloin-redux.godot.save.v1');
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.programme?.published) && parsed.programme.published.length === 4 && Array.isArray(parsed.hosting?.results) && parsed.hosting.results.length === 4;
    }, null, { timeout: 10000 });
    // Round 8: Verify M5 Neighborhood Voices starts default-off before any toggle
    const initialVoicesState = await page.evaluate(() => ({
      settingsRaw: window.localStorage.getItem('tenderloin-redux.godot.settings.v1'),
      voicesEnabled: window.__tenderloinGodotA11ySnapshot?.voices_enabled,
      voicesStatus: window.__tenderloinGodotA11ySnapshot?.voices_status
    }));
    assert.equal(initialVoicesState.settingsRaw, null, 'M5 Neighborhood Voices settings key must not exist before explicit user toggle');
    assert.equal(initialVoicesState.voicesEnabled, false, 'M5 Neighborhood Voices must start default-off');
    assert.equal(initialVoicesState.voicesStatus, 'off', 'M5 Neighborhood Voices initial status must be off');
    // Press KeyQ (3x) to start, convene, and complete M4 Peaceful Tenant Listening Hour
    for (let qStep = 0; qStep < 3; qStep++) {
      await page.keyboard.press('KeyQ');
      await page.waitForTimeout(80);
    }
    await page.waitForFunction(() => {
      const raw = window.localStorage.getItem('tenderloin-redux.godot.save.v1');
      if (!raw) return false;
      return JSON.parse(raw).civic?.phase === 'done';
    }, null, { timeout: 10000 });
    // Press Period (6x) to start M4 Film Short (The Open Seat), hold storyboard, begin shooting, and capture all 3 shots (seat, paint, welcome)
    for (let fStep = 0; fStep < 6; fStep++) {
      await page.keyboard.press('Period');
      await page.waitForTimeout(80);
    }
    await page.waitForFunction(() => {
      const raw = window.localStorage.getItem('tenderloin-redux.godot.save.v1');
      if (!raw) return false;
      const film = JSON.parse(raw).film;
      return film && film.phase === 'done' && Array.isArray(film.captured) && film.captured.length === 3;
    }, null, { timeout: 10000 });
    // Press Slash to opt-in to M5 Experimental Neighborhood Voices and verify separate settings storage + profile presentation + disclaimer
    await page.keyboard.press('Slash');
    await page.waitForFunction(() => {
      const s = window.__tenderloinGodotA11ySnapshot;
      return s && s.voices_enabled === true && s.voices_status === 'ready' && s.voices_count === 3;
    }, null, { timeout: 10000 });
    const voicesLiveText = await page.evaluate(() => document.getElementById('godot-a11y-status')?.textContent || '');
    assert.ok(voicesLiveText.includes('Tenderloin Neighborhood Development Corporation') && voicesLiveText.includes('GLIDE') && voicesLiveText.includes('Larkin Street Youth Services') && voicesLiveText.includes('No organization endorses or assigns missions in this game.'), 'Enabling M5 Neighborhood Voices must announce all 3 verified organization profiles and the non-affiliation disclaimer');
    const genBeforeSuspend = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot?.voices_generation || 0);
    await page.evaluate(() => { window.__tenderloinWebVoicesLifecyclePending = 'suspend'; });
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.voices_status === 'paused', null, { timeout: 10000 });
    const pausedSnap = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
    assert.equal(pausedSnap.voices_generation, genBeforeSuspend + 1, 'Web pagehide suspend must increment voices_generation and release active records');
    assert.equal(pausedSnap.voices_count, 0, 'Web pagehide suspend must clear voices_records');
    await page.evaluate(() => { window.__tenderloinWebVoicesLifecyclePending = 'resume'; });
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.voices_status === 'ready' && window.__tenderloinGodotA11ySnapshot?.voices_count === 3, null, { timeout: 10000 });
    // Request M6 local performance measurement inside running Godot Wasm instance
    await page.evaluate(() => window.__tenderloinRequestPerfSnapshot());
    await page.waitForFunction(() => Boolean(window.__tenderloinLastPerfSnapshot), null, { timeout: 10000 });
    const perfSnap = await page.evaluate(() => window.__tenderloinLastPerfSnapshot);
    assert.equal(perfSnap.within_budget, true, `Godot Web Wasm runtime performance snapshot must meet all M6 budgets: ${JSON.stringify({ ...perfSnap, svg_samples: undefined })}`);
    assert.equal(perfSnap.total_buildings_count, 188);
    assert.equal(perfSnap.pathfind_cold_cache, true, 'Pathfinding benchmark must run with cold cell_walkable_cache');
    assert.equal(perfSnap.astar_used, true, 'Pathfinding benchmark from Thanh (Taylor St) to Black Hawk (Turk & Hyde) must exercise A* search');
    assert.ok(perfSnap.astar_expanded_cells > 0, 'Pathfinding benchmark must expand > 0 A* cells');
    assert.ok(perfSnap.save_bytes > 0 && perfSnap.save_bytes <= 4096, `Godot save payload (${perfSnap.save_bytes} bytes) must stay <= 4096 bytes`);
    assert.ok(perfSnap.pathfind_blackhawk_usec < 250000, `Black Hawk A* pathfinding (${perfSnap.pathfind_blackhawk_usec} us) must stay < 250ms`);
    assert.equal(perfSnap.voices_teardown_measured, true, 'M5 Voices teardown must be genuinely measured after suspend');
    assert.ok(perfSnap.voices_teardown_usec > 0 && perfSnap.voices_teardown_usec < 50000, `M5 Voices teardown (${perfSnap.voices_teardown_usec} us) must stay < 50ms`);
    // Verify byte-for-byte parity for all 5 M6 SVG builders against public/*.js reference functions
    for (const [sampleName, svgStr] of Object.entries(perfSnap.svg_samples || {})) {
      assert.ok(typeof svgStr === 'string' && svgStr.startsWith('<svg '), `svg_samples.${sampleName} must be non-empty SVG`);
    }
    assert.equal(
      perfSnap.svg_samples?.keepsake,
      postcardSVG({
        status: 'taken',
        participants: ['bea', 'celeste', 'dez', 'thanh'],
        mural: { sun: { col: 0, row: 0 }, wave: { col: 2, row: 1 }, rise: { col: 4, row: 2 } },
        palette: 'garden',
        layout: 'table'
      }),
      'build_keepsake_svg sample must match public/keepsake.js postcardSVG byte-for-byte'
    );
    assert.equal(
      perfSnap.svg_samples?.programme,
      programmeSVG(['stories', 'beats', 'pause', 'art']),
      'build_programme_svg sample must match public/programme.js programmeSVG byte-for-byte'
    );
    assert.equal(
      perfSnap.svg_samples?.tile_panel,
      tilePanelSVG({ palette: 'warm', tiles: [0, 1, 2, 2, 1, 0] }),
      'build_tile_panel_svg sample must match public/hosting.js tilePanelSVG byte-for-byte'
    );
    assert.equal(
      perfSnap.svg_samples?.civic_plan,
      civicPlanSVG({ topic: 'repairs', format: 'circle', notes: 'themes' }),
      'build_civic_plan_svg sample must match public/civic.js civicPlanSVG byte-for-byte'
    );
    assert.equal(
      perfSnap.svg_samples?.film_frame,
      filmFrameSVG({ framing: 'close', plan: 'quiet', order: ['seat', 'paint', 'welcome'] }, 'seat'),
      'build_film_frame_svg sample must match public/film.js filmFrameSVG byte-for-byte'
    );
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
    assert.ok(a11yDom.summaryText.includes('Neighbors 5/5') && a11yDom.summaryText.includes('Mural 3/3') && a11yDom.summaryText.includes('Block Opened') && a11yDom.summaryText.includes("Compton's Read") && a11yDom.summaryText.includes('Black Hawk Found') && a11yDom.summaryText.includes('District Hidden') && a11yDom.summaryText.includes('Keepsake taken') && a11yDom.summaryText.includes('Loans 3/3') && a11yDom.summaryText.includes('Hosted 4/4') && a11yDom.summaryText.includes('Civic done') && a11yDom.summaryText.includes('Film done (3/3)') && a11yDom.summaryText.includes('Voices On:ready'), 'DOM #godot-a11y-summary must reflect 5/5 neighbors, 3/3 mural, Block Opened, Compton\'s Read, Black Hawk Found, District Hidden, Keepsake taken, Loans 3/3, Hosted 4/4, Civic done, Film done (3/3), and Voices On:ready');
    assert.equal(a11yDom.savePickerReady, true, 'Web JSON save file picker fallback input and queue bridge must be initialized');
    assert.equal(a11yDom.snapshot?.music_playing, false, 'Block opening, wider Tenderloin, and M1/M3/M4 completion must succeed with music_playing === false (sound-independent completion)');
    assert.equal(a11yDom.snapshot?.total_buildings, 188, 'A11y snapshot must report 188 total measured Tenderloin buildings');
    assert.equal(a11yDom.snapshot?.wider_buildings_count, 130, 'A11y snapshot must report 130 wider Tenderloin buildings');
    assert.equal(a11yDom.snapshot?.epilogue_done, true, 'A11y snapshot must report epilogue_done === true');
    assert.equal(a11yDom.snapshot?.hosting_done, true, 'A11y snapshot must report hosting_done === true');
    assert.equal(a11yDom.snapshot?.civic_phase, 'done', 'A11y snapshot must report civic_phase === done');
    assert.equal(a11yDom.snapshot?.film_phase, 'done', 'A11y snapshot must report film_phase === done');
    assert.equal(a11yDom.snapshot?.film_captured_count, 3, 'A11y snapshot must report film_captured_count === 3');
    assert.equal(a11yDom.snapshot?.voices_enabled, true, 'A11y snapshot must report voices_enabled === true after Slash toggle');
    assert.equal(a11yDom.snapshot?.voices_count, 3, 'A11y snapshot must report 3 verified Tenderloin organization profiles');
    // Discover through real input, and inspect actual 3D keepsake-node visibility.
    for (let found = 1; found <= 10; found++) {
      if (found === 2 || found === 3) {
        const beforeToggleSound = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot.reward_sound_count);
        await clickHeaderControl('sounds_control');
        await page.waitForFunction(enabled => window.__tenderloinGodotA11ySnapshot?.reward_sounds_enabled === enabled, found === 3);
        await page.waitForTimeout(850);
        const afterToggleSound = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
        assert.equal(afterToggleSound.reward_sound_count, beforeToggleSound, 'unmute does not replay missed sounds');
        assert.equal(afterToggleSound.reward_audio_playing, false);
      }
      const soundCountBefore = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot.reward_sound_count);
      await page.keyboard.press('Shift+KeyD');
      await page.waitForFunction((count) => {
        const snap = window.__tenderloinGodotA11ySnapshot;
        const save = JSON.parse(localStorage.getItem('tenderloin-redux.godot.save.v1') || '{}');
        return snap?.surprises_found === count && snap?.keepsakes_visible === count && save.discovered_surprises?.length === count;
      }, found, { timeout: 10000 });
      assert.match(await page.locator('#godot-a11y-status').textContent(), /Keepsake:/);
      const rewardSnap = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
      assert.equal(rewardSnap.reward_sound_count, soundCountBefore + (found === 2 ? 0 : 1), 'fresh rewards obey sound preference with music paused');
      assert.equal(rewardSnap.music_playing, false);
      assert.match(rewardSnap.progress_text, new RegExp(`Keepsakes: ${found}/10`));
      if (found === 1) {
        assert.equal(rewardSnap.reward_audio_playing, true, 'the real Web audio player starts an unmuted effect');
        await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.reward_audio_playing === false);
      }
    }
    const tenSurprises = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
    assert.match(tenSurprises.last_reward_title, /^10\/10 Surprises:/);
    assert.equal(tenSurprises.objective_tour_id, 'museum:0');
    await page.keyboard.press('Shift+KeyD');
    await page.waitForTimeout(600);
    const rediscovery = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
    assert.equal(rediscovery.surprises_found, 10);
    assert.equal(rediscovery.sparks, tenSurprises.sparks, 'Revisiting a surprise cannot award Sparks again');
    assert.equal(rediscovery.reward_burst_count, tenSurprises.reward_burst_count);
    assert.equal(rediscovery.reward_sound_count, tenSurprises.reward_sound_count, 'revisits do not replay sounds');
    await page.keyboard.press('Digit1');
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.conversation_actions?.some(a => a.id === 'landmark_tour'), null, { timeout: 35000 });
    // Read-only native control geometry; all activation remains real browser clicks.
    async function clickConversationAction(id) {
      await page.waitForFunction(actionId => window.__tenderloinGodotA11ySnapshot?.conversation_actions?.some(a => a.id === actionId), id);
      const previousFrame = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot.ui_frame);
      await page.waitForFunction(frame => window.__tenderloinGodotA11ySnapshot?.ui_frame > frame, previousFrame);
      const snap = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
      const action = snap.conversation_actions.find(a => a.id === id);
      assert.ok(action.width >= 44 && action.height >= 44, `${id} must retain a 44px target at ${size.width}`);
      assert.ok(action.x >= 0 && action.y >= 0 && action.x + action.width <= snap.viewport_width + 1 && action.y + action.height <= snap.viewport_height + 1, `${id} must fit the viewport`);
      const canvas = await page.locator('#canvas').boundingBox();
      await page.mouse.click(canvas.x + (action.x + action.width / 2) * canvas.width / snap.viewport_width, canvas.y + (action.y + action.height / 2) * canvas.height / snap.viewport_height);
    }
    await page.screenshot({ path: `artifacts/godot-${size.width}-all-keepsakes-conversation.png` });
    if (size.width < 600) assert.match((await page.evaluate(() => window.__tenderloinGodotA11ySnapshot)).conversation_header, /^Bea · Turn \d\/5 · Sparks: \d+$/);
    await clickConversationAction('whats_next');
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.announcement.includes('0/12 stops this session'));
    await clickConversationAction('eateries');
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.announcement.includes('Tap the counter to order'));
    assert.equal((await page.evaluate(() => window.__tenderloinGodotA11ySnapshot)).tour_count, 0, 'Framing a cafe does not count as placing an order');
    function assertReadableOverlays(snap, context) {
      const { speech, reward, talk, captions } = snap.overlays;
      const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
      const area = snap.play_area;
      const contained = r => r.x >= area.x - 1 && r.y >= area.y - 1 && r.x + r.width <= area.x + area.width + 1 && r.y + r.height <= area.y + area.height + 1;
      const occupied = [];
      for (const [name, rect] of [['reward', reward], ['speech', speech], ['talk', talk], ...captions.map(c => [c.id, c])]) {
        if (['speech', 'reward', 'talk'].includes(name) && !rect.visible) continue;
        assert.ok(contained(rect), `${context}: ${name} fits the play area`);
        for (const [other, previous] of occupied) assert.ok(!overlaps(rect, previous), `${context}: ${name} must clear ${other}`);
        occupied.push([name, rect]);
      }
    }
    async function clickScenePoint(snap, point) {
      const canvas = await page.locator('#canvas').boundingBox();
      await page.mouse.click(canvas.x + point.x * canvas.width / snap.viewport_width, canvas.y + point.y * canvas.height / snap.viewport_height);
    }
    const saveBeforeTour = await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1'));
    for (let visited = 1; visited <= 12; visited++) {
      if (visited === 2) {
        await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.guide_marker_screen?.visible === true);
        const snap = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
        const canvas = await page.locator('#canvas').boundingBox();
        await page.mouse.click(canvas.x + snap.guide_marker_screen.x * canvas.width / snap.viewport_width, canvas.y + snap.guide_marker_screen.y * canvas.height / snap.viewport_height);
      } else {
        await clickConversationAction('landmark_tour');
      }
      await page.waitForFunction(count => window.__tenderloinGodotA11ySnapshot?.tour_count === count, visited, { timeout: 10000 });
      const snap = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
      if (visited === 4) {
        assert.equal(snap.museum_eras_count, 4);
        assert.equal(snap.objective_tour_id, 'park');
      }
      if (visited === 5) assert.equal(snap.park_visited, true);
      if (visited === 6) assert.equal(snap.so_what_visited, true);
      if (visited >= 7) {
        const frame = snap.ui_frame;
        await page.waitForFunction(previous => window.__tenderloinGodotA11ySnapshot.ui_frame > previous, frame);
        const composed = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
        assertReadableOverlays(composed, `${size.width}px eatery ${visited - 6}`);
        assert.match(composed.overlays.speech.text, /\(fictional\)/, 'host dialogue retains venue identity and fiction disclosure');
        if (visited === 7) await page.screenshot({ path: `artifacts/godot-${size.width}-order-overlays.png` });
      }
    }
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.tour_celebrated === true, null, { timeout: 10000 });
    const tourComplete = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
    assert.equal(tourComplete.last_reward_title, 'Neighborhood Tour Complete!');
    assert.match(await page.locator('#godot-a11y-summary').textContent(), /Optional tour 12\/12 this session/);
    assert.equal(tourComplete.objective_tour_id, '');
    assert.match(tourComplete.announcement, /12 stops visited this session/);
    assert.equal(await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1')), saveBeforeTour, 'Tour session progress never writes the Godot save');
    assert.ok(Buffer.byteLength(saveBeforeTour, 'utf8') <= 4096, 'Full progression plus ten surprises stays inside the save budget');
    await page.screenshot({ path: `artifacts/godot-${size.width}-tour-complete.png` });
    assertReadableOverlays(tourComplete, `${size.width}px tour reward`);
    // Ordinary mouse input on a banner must not activate the scene behind it.
    if (tourComplete.overlays.reward.visible) {
      const r = tourComplete.overlays.reward;
      await clickScenePoint(tourComplete, { x: r.x + r.width / 2, y: r.y + r.height / 2 });
      await page.waitForFunction(frame => window.__tenderloinGodotA11ySnapshot.ui_frame > frame, tourComplete.ui_frame);
      const afterBannerTap = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
      assert.equal(afterBannerTap.overlays.counter.orders, tourComplete.overlays.counter.orders);
      assert.ok(afterBannerTap.ui_frame > tourComplete.ui_frame, 'banner tap check observes a fresh composed frame');
      if (size.width < 600) {
        assert.equal(tourComplete.overlays.speech.deferred, true, 'phone reward postpones host speech');
        assert.equal(afterBannerTap.overlays.speech.deferred, true, 'speech remains deferred during this reward');
        assert.equal(afterBannerTap.overlays.speech.remaining, tourComplete.overlays.speech.remaining, 'deferred speech keeps all reading time');
      }
    }
    await page.waitForFunction(() => {
      const o = window.__tenderloinGodotA11ySnapshot?.overlays;
      return o && !o.reward.visible && o.speech.visible && !o.speech.deferred;
    }, null, { timeout: 10000 });
    const hostSpeaking = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
    assertReadableOverlays(hostSpeaking, `${size.width}px host after reward`);
    assert.ok(hostSpeaking.overlays.speech.remaining > 3, 'host receives real reading time after the banner');
    await page.screenshot({ path: `artifacts/godot-${size.width}-host-after-reward.png` });
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.overlays?.speech.anchor === '', null, { timeout: 20000 });
    const restored = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
    assertReadableOverlays(restored, `${size.width}px restored captions`);
    const venueCaption = restored.overlays.captions.find(c => c.eatery_index === restored.overlays.counter.index && c.id.includes('EateryLabel_'));
    assert.ok(venueCaption, 'large venue caption returns after dialogue ends');
    assert.match(venueCaption.text, /\(fictional\)/);
    await page.screenshot({ path: `artifacts/godot-${size.width}-captions-restored.png` });
    await clickScenePoint(restored, { x: venueCaption.x + 5, y: venueCaption.y + venueCaption.height / 2 });
    await page.waitForFunction(count => window.__tenderloinGodotA11ySnapshot?.overlays?.counter?.orders === count, restored.overlays.counter.orders + 1);
    const captionTapped = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
    assert.equal(captionTapped.tour_count, 12);
    assert.equal(captionTapped.sparks, tourComplete.sparks);
    assert.equal(captionTapped.reward_burst_count, tourComplete.reward_burst_count);
    assert.equal(captionTapped.reward_sound_count, tourComplete.reward_sound_count);
    assert.equal(await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1')), saveBeforeTour, 'caption taps and overlay lifecycle never mutate progress storage');
    await page.keyboard.press('Shift+KeyM');
    await page.waitForTimeout(600);
    const tourRevisit = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
    assert.equal(tourRevisit.tour_count, 12);
    assert.equal(tourRevisit.reward_burst_count, tourComplete.reward_burst_count, 'Revisiting a completed tour never repeats its reward');
    const progressBeforeMute = await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1'));
    await clickHeaderControl('sounds_control');
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.reward_sounds_enabled === false);
    assert.equal(await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1')), progressBeforeMute, 'sound preference cannot mutate game progress');
    const storageBeforeReload = await page.evaluate(() => ({
      godotSave: window.localStorage.getItem('tenderloin-redux.godot.save.v1'),
      godotSettings: window.localStorage.getItem('tenderloin-redux.godot.settings.v1'),
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
    assert.ok(storageBeforeReload.godotSettings, `Godot Web export must persist M5 settings to tenderloin-redux.godot.settings.v1 at ${size.width}`);
    const parsedSettings = JSON.parse(storageBeforeReload.godotSettings);
    assert.equal(parsedSettings.schema, 'tenderloin-redux.godot.settings.v1');
    assert.equal(parsedSettings.reward_sounds, false);
    assert.equal(parsedSettings.neighborhood_voices, true);
    assert.ok(!storageBeforeReload.godotSave.includes('suno-browser-test.wav'), 'Local Suno audio filename must stay tab-local and never persist in save JSON');
    const parsedSave = JSON.parse(storageBeforeReload.godotSave);
    assert.equal(parsedSave.schema, 'tenderloin-redux.godot.save');
    assert.equal(parsedSave.version, 1);
    assert.equal('voices_enabled' in parsedSave || 'neighborhood_voices' in parsedSave, false, 'Game save JSON must never store voices_enabled / neighborhood_voices preference');
    assert.ok(parsedSave.save_seq >= 30, 'save_seq must increment across talk, 3 motif placements, palette change, Rook soundcheck, Dez/Thanh visits, block opening, Compton\'s Corner, Black Hawk, M1 keepsake/loan returns, M3 programme/hosting, M4 civic/film, and district boundary toggle');
    assert.equal(parsedSave.celeste_talk_count, 1);
    assert.equal(parsedSave.mural_palette, 'sunset');
    assert.equal(parsedSave.rook_soundcheck_done, true);
    assert.equal(parsedSave.block_opened, true);
    assert.equal(parsedSave.history_read, true);
    assert.equal(parsedSave.blackhawk_discovered, true);
    assert.equal(parsedSave.district_boundary_visible, false);
    assert.equal(parsedSave.epilogue?.photo?.status, 'taken');
    assert.deepEqual(parsedSave.epilogue?.photo?.participants, ['bea', 'celeste', 'dez', 'thanh']);
    assert.deepEqual(parsedSave.epilogue?.returned, ['table', 'paint-case', 'speaker']);
    assert.deepEqual(parsedSave.programme?.published, ['stories', 'beats', 'pause', 'art']);
    assert.equal(parsedSave.hosting?.results?.length, 4);
    assert.equal(parsedSave.civic?.phase, 'done');
    assert.equal(parsedSave.civic?.result?.topic, 'repairs');
    assert.equal(parsedSave.film?.phase, 'done');
    assert.deepEqual(parsedSave.film?.captured, ['seat', 'paint', 'welcome']);
    assert.deepEqual(parsedSave.visited_neighbors, ['bea', 'celeste', 'dez', 'rook', 'thanh']);
    assert.deepEqual(Object.keys(parsedSave.mural_placements).sort(), ['rise', 'sun', 'wave']);
    await page.reload();
    await page.locator('#status').waitFor({ state: 'hidden', timeout: 60000 });
    await page.waitForTimeout(600);
    const soundReload = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
    assert.equal(soundReload.reward_sounds_enabled, false);
    assert.equal(soundReload.reward_audio_unlocked, false);
    assert.equal(soundReload.reward_sound_count, 0);
    assert.equal(soundReload.reward_audio_playing, false);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !window.__tenderloinGodotA11ySnapshot?.in_overview && window.__tenderloinGodotA11ySnapshot?.camera_view_size <= 58);
    // Prove load_godot_state() and load_godot_settings() restored both game save and M5 settings on reload:
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
      browserSave: window.localStorage.getItem('tenderloin-redux.save.v1'),
      snapshot: window.__tenderloinGodotA11ySnapshot
    }));
    assert.equal(storageAfterReload.browserSave, BROWSER_SAVE_SENTINEL, 'Browser game save sentinel must remain intact after reload and post-reload save');
    assert.equal(storageAfterReload.snapshot?.voices_enabled, true, 'Post-reload snapshot must restore voices_enabled from tenderloin-redux.godot.settings.v1');
    const postReloadSave = JSON.parse(storageAfterReload.godotSave);
    assert.deepEqual(postReloadSave.discovered_surprises, parsedSave.discovered_surprises, 'All surprise discoveries survive reload');
    assert.equal(new Set(postReloadSave.discovered_surprises).size, 10);
    assert.equal(storageAfterReload.snapshot?.keepsakes_visible, 10);
    assert.equal(storageAfterReload.snapshot?.tour_count, 0, 'Session tour starts fresh on reload');
    assert.equal(storageAfterReload.snapshot?.tour_celebrated, false);
    assert.equal(storageAfterReload.snapshot?.objective_tour_id, 'museum:0');
    assert.equal(postReloadSave.celeste_talk_count, parsedSave.celeste_talk_count + 1, 'Post-reload talk must increment restored celeste_talk_count');
    assert.equal(postReloadSave.mural_palette, 'sunset', 'Post-reload save must preserve restored sunset palette');
    assert.equal(postReloadSave.rook_soundcheck_done, true, 'Post-reload save must preserve restored rook_soundcheck_done');
    assert.equal(postReloadSave.block_opened, true, 'Post-reload save must preserve restored block_opened');
    assert.equal(postReloadSave.history_read, true, 'Post-reload save must preserve restored history_read');
    assert.equal(postReloadSave.blackhawk_discovered, true, 'Post-reload save must preserve restored blackhawk_discovered');
    assert.equal(postReloadSave.district_boundary_visible, false, 'Post-reload save must preserve restored district_boundary_visible');
    assert.deepEqual(postReloadSave.epilogue, parsedSave.epilogue, 'Post-reload save must preserve restored M1 epilogue keepsake and returned loans');
    assert.deepEqual(postReloadSave.programme, parsedSave.programme, 'Post-reload save must preserve restored M3 programme');
    assert.deepEqual(postReloadSave.hosting, parsedSave.hosting, 'Post-reload save must preserve restored M3 hosting results');
    assert.deepEqual(postReloadSave.civic, parsedSave.civic, 'Post-reload save must preserve restored M4 civic listening hour');
    assert.deepEqual(postReloadSave.film, parsedSave.film, 'Post-reload save must preserve restored M4 film short');
    assert.deepEqual(postReloadSave.mural_placements, parsedSave.mural_placements, 'Post-reload save must preserve all 3 restored motif placements');
    // Merge while Godot keepsakes still exist. The later fresh-import fixture deliberately clears them.
    await page.evaluate(() => window.__tenderloinQueueBrowserSaveJson(JSON.stringify({
      version: 1,
      core: { greeted: true, layout: 'table', furniture: {}, litter: [], mural: {}, palette: 'garden', soundcheck: false, opened: false, history: false, blackhawk: false }
    }), ''));
    await page.waitForFunction(seq => JSON.parse(localStorage.getItem('tenderloin-redux.godot.save.v1') || '{}').save_seq > seq, postReloadSave.save_seq);
    const keptSurprises = await page.evaluate(() => JSON.parse(localStorage.getItem('tenderloin-redux.godot.save.v1')));
    assert.deepEqual(keptSurprises.discovered_surprises, parsedSave.discovered_surprises, 'Partial browser import preserves existing Godot surprise keepsakes');
    assert.equal(await page.evaluate(() => localStorage.getItem('tenderloin-redux.save.v1')), BROWSER_SAVE_SENTINEL, 'Partial file import keeps the browser save read-only');
    // Build a genuine public/core.js v1 save via applyAction + serializeSave with ocean palette, M1 keepsake + loans, M3 hosting, M4 civic (access/dropin/none), M4 film (welcome/seat/paint, wide/later), and optional metadata
    let bState = initialState();
    for (const act of [
      { type: 'greet' },
      { type: 'layout', value: 'table' },
      { type: 'furniture', id: 'table', col: 1, row: 0 },
      { type: 'furniture', id: 'seats', col: 4, row: 0 },
      { type: 'furniture', id: 'speaker', col: 1, row: 3 },
      { type: 'tidy', id: 'cup' },
      { type: 'tidy', id: 'offcuts' },
      { type: 'tidy', id: 'wrapper' },
      { type: 'palette', value: 'ocean' },
      { type: 'mural', id: 'sun', col: 0, row: 0 },
      { type: 'mural', id: 'wave', col: 2, row: 1 },
      { type: 'mural', id: 'rise', col: 4, row: 2 },
      { type: 'soundcheck' },
      { type: 'history' },
      { type: 'discover-blackhawk' },
      { type: 'open' },
      { type: 'photo', participants: ['dez', 'bea'] },
      { type: 'pack' },
      { type: 'return-loan', id: 'table' },
      { type: 'return-loan', id: 'paint-case' },
      { type: 'return-loan', id: 'speaker' },
      { type: 'programme-add', id: 'beats' },
      { type: 'programme-add', id: 'pause' },
      { type: 'programme-add', id: 'stories' },
      { type: 'programme-add', id: 'art' },
      { type: 'programme-publish' },
      { type: 'host-start' },
      { type: 'host-beat', step: 0 },
      { type: 'host-beat', step: 2 },
      { type: 'host-beat', step: 4 },
      { type: 'host-beat', step: 6 },
      { type: 'host-complete', id: 'beats' },
      { type: 'host-quiet', value: 'pairs' },
      { type: 'host-complete', id: 'pause' },
      { type: 'host-story', value: 'future' },
      { type: 'host-complete', id: 'stories' },
      { type: 'host-palette', value: 'cool' },
      { type: 'host-tile', cell: 0 },
      { type: 'host-complete', id: 'art' },
      { type: 'civic-start' },
      { type: 'civic-choice', key: 'topic', value: 'access' },
      { type: 'civic-choice', key: 'format', value: 'dropin' },
      { type: 'civic-choice', key: 'notes', value: 'none' },
      { type: 'civic-open' },
      { type: 'civic-close' },
      { type: 'film-start' },
      { type: 'film-move', id: 'welcome', direction: -1 },
      { type: 'film-move', id: 'welcome', direction: -1 },
      { type: 'film-choice', key: 'framing', value: 'wide' },
      { type: 'film-choice', key: 'plan', value: 'later' },
      { type: 'film-roll' },
      { type: 'film-clear' },
      { type: 'film-capture', id: 'welcome' },
      { type: 'film-capture', id: 'seat' },
      { type: 'film-capture', id: 'paint' }
    ]) {
      bState = applyAction(bState, act);
    }
    bState = { ...bState, optional: { voices_bookmark: 'glide' } };
    const seededBrowserSave = serializeSave(bState);
    // Clear Godot save AND Godot settings before reload so Godot starts fresh with Voices off, proving KeyI imports M1-M4 + optional without auto-enabling M5 Voices
    await page.evaluate((raw) => {
      window.localStorage.removeItem('tenderloin-redux.godot.save.v1');
      window.localStorage.removeItem('tenderloin-redux.godot.settings.v1');
      window.localStorage.setItem('tenderloin-redux.save.v1', raw);
    }, seededBrowserSave);
    await page.reload();
    await page.locator('#status').waitFor({ state: 'hidden', timeout: 60000 });
    await page.waitForTimeout(500);
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
    assert.deepEqual(afterValidImport.godotSave.epilogue?.photo?.participants, ['bea', 'dez'], 'Explicit KeyI import must map browser keepsake photo participants in canonical order');
    assert.deepEqual(afterValidImport.godotSave.epilogue?.returned, ['table', 'paint-case', 'speaker'], 'Explicit KeyI import must map all 3 returned neighbor loans');
    assert.equal(afterValidImport.godotSave.hosting?.results?.length, 4, 'Explicit KeyI import must preserve all 4/4 browser-produced M3 hosted segments (beats=0, pause=pairs, stories=future, art=cool)');
    assert.deepEqual(afterValidImport.godotSave.hosting?.results?.map(r => r.id), ['beats', 'pause', 'stories', 'art']);
    assert.equal(afterValidImport.godotSave.hosting?.results?.[0]?.value, 0, 'Imported beats segment must preserve 0 listening round value');
    assert.equal(afterValidImport.godotSave.hosting?.results?.[1]?.value, 'pairs', 'Imported pause segment must preserve pairs value');
    assert.equal(afterValidImport.godotSave.hosting?.results?.[2]?.value, 'future', 'Imported stories segment must preserve future value');
    assert.equal(afterValidImport.godotSave.hosting?.results?.[3]?.value?.palette, 'cool', 'Imported art segment must preserve cool palette');
    assert.equal(afterValidImport.godotSave.civic?.phase, 'done', 'Explicit KeyI import must map browser M4 civic done phase');
    assert.deepEqual(afterValidImport.godotSave.civic?.result, { topic: 'access', format: 'dropin', notes: 'none' }, 'Explicit KeyI import must map browser M4 civic result');
    assert.equal(afterValidImport.godotSave.film?.phase, 'done', 'Explicit KeyI import must map browser M4 film done phase');
    assert.deepEqual(afterValidImport.godotSave.film?.captured, ['welcome', 'seat', 'paint'], 'Explicit KeyI import must map browser M4 film captured order');
    assert.deepEqual(afterValidImport.godotSave.optional, { voices_bookmark: 'glide' }, 'Explicit KeyI import must preserve bounded optional save data');
    assert.equal(afterValidImport.snapshot?.voices_enabled, false, 'Importing browser save with optional data must never auto-enable M5 Neighborhood Voices');
    // Queue a partial browser save via the cross-origin .json file picker bridge and verify monotonic merge preserves 5/5 neighbors, 3/3 ocean mural, block_opened, history_read, blackhawk_discovered, M1 epilogue, M3 hosting, and M4 civic/film
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
    assert.deepEqual(afterFileBridgeMerge.epilogue?.returned, ['table', 'paint-case', 'speaker'], 'File picker bridge monotonic merge must preserve M1 returned loans');
    assert.equal(afterFileBridgeMerge.hosting?.results?.length, 4, 'File picker bridge monotonic merge must preserve M3 completed hosting segments');
    assert.equal(afterFileBridgeMerge.civic?.phase, 'done', 'File picker bridge monotonic merge must preserve M4 civic done state');
    assert.equal(afterFileBridgeMerge.film?.phase, 'done', 'File picker bridge monotonic merge must preserve M4 film done state');
    assert.deepEqual(afterFileBridgeMerge.discovered_surprises, [], 'Fresh browser import does not invent Godot-only surprise discoveries');
    const explorationEvidence = { walkingStopControlVerified: true, compactHeaderHeight: startup.header_control.height, compactInfoToggleVerified: true, startupOrientationVerified: true, findMeAndMapVerified: true, rewardSoundsAndMuteVerified: true, persistentProgressVerified: true, surpriseDiscoveryVerified: true, surpriseKeepsakeReloadVerified: true, chapter6ConversationVerified: true, sessionLandmarkTourVerified: true, fullSaveBytes: Buffer.byteLength(saveBeforeTour, 'utf8') };
    runs.push({ ...explorationEvidence, viewport: size, overviewBytes: before.length, selectedBytes: after.length, neighborBytes: neighbor.length, muralBytes: muralShot.length, musicBytes: musicShot.length, blockBytes: blockShot.length, blackhawkBytes: blackhawkShot.length, wideBytes: wideShot.length, keyboardActivationVerified: true, neighborWalkVerified: true, muralSaveReloadVerified: true, rookMusicAuditionVerified: true, blockCompletionVerified: true, widerTenderloinVerified: true, m1EpilogueVerified: true, m3HostingVerified: true, m4CivicFilmVerified: true, m5VoicesIsolatedVerified: true, m6KeepsakeSvgExportVerified: true, m6PerfBudgetVerified: true, perfSnapshot: perfSnap, browserSaveImportVerified: true, domA11yLiveVerified: true });
    await context.close();
  }
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  await writeFile('artifacts/godot-browser.json', JSON.stringify({ runs, errors, external, limit: 'Pixel-change, isolated Godot localStorage save/reload, opt-in browser v1 save import, Web local WAV audition, DOM aria-live status bridge, wider 188-building Tenderloin exploration, M1 keepsake/loan returns, M3 programme/hosting, M4 civic listening hour & three-shot film short, M5 default-off neighborhood voices & isolated settings, M6 original SVG generation/export & measured local performance budgets, and driver-inspected screenshots, not full canvas button DOM/screen-reader or physical-phone acceptance.' }, null, 2));
  console.log(JSON.stringify({ runs, errors, external }));
} catch (error) {
  if (latestPage && !latestPage.isClosed()) {
    await latestPage.screenshot({ path: 'artifacts/godot-browser-failure.png' });
    await writeFile('artifacts/godot-browser-failure.json', JSON.stringify({
      error: String(error),
      viewport: latestPage.viewportSize(),
      snapshot: await latestPage.evaluate(() => window.__tenderloinGodotA11ySnapshot),
      performance: await latestPage.evaluate(() => window.__tenderloinLastPerfSnapshot || null)
    }, null, 2));
  }
  throw error;
} finally { await browser.close(); }
