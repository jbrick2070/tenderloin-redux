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
let queuedActivityRewardChecks = 0;
const shortStoryReadChecks = [];
const shortHubChecks = [];
const shortActivityChecks = [];
const narrowActivityChecks = [];
const passiveActivityChecks = [];
const narrowHubChecks = [];
const shortWalkingChecks = [];
let shortWalkingCaptionChecks = 0, shortWalkingGuideChecks = 0;
let smallHubReaderChecks = 0;

async function verifyShortWalking(page,context,touch) {
  const snapshot=()=>page.evaluate(()=>window.__tenderloinGodotA11ySnapshot);
  async function settle(){const s=await snapshot();await page.waitForFunction(f=>window.__tenderloinGodotA11ySnapshot.ui_frame>f+3&&!window.__tenderloinGodotA11ySnapshot.compact_panel_layout_pending,s.ui_frame);}
  const encloses=(a,b)=>b.x>=a.x-1&&b.y>=a.y-1&&b.x+b.width<=a.x+a.width+1&&b.y+b.height<=a.y+a.height+1;
  const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
  async function tap(b){const s=await snapshot(),c=await page.locator('#canvas').boundingBox();assert.ok(b.visible&&b.width>=44&&b.height>=44);const x=c.x+(b.x+b.width/2)*c.width/s.viewport_width,y=c.y+(b.y+b.height/2)*c.height/s.viewport_height;if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);await settle();}
  const sizes=touch?[[520,360],[559,360],[560,360],[599,360]]:[[520,360],[559,360],[560,360],[568,375],[599,360],[599,480]];
  for(const [width,height] of sizes){
    await page.keyboard.press('KeyF');await page.setViewportSize({width,height});await settle();
    if(width===599&&height===480){
      await page.keyboard.press('KeyJ');
      await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.block_panel_control.visible&&!window.__tenderloinGodotA11ySnapshot.player_grounding.path_active&&window.__tenderloinGodotA11ySnapshot.camera_view_size===55&&!window.__tenderloinGodotA11ySnapshot.following_player,{},{timeout:60000});
      await page.keyboard.press('KeyF');
      await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.camera_view_size===45&&window.__tenderloinGodotA11ySnapshot.following_player&&!window.__tenderloinGodotA11ySnapshot.block_panel_control.visible);await settle();
      const arrival=await snapshot();assert.ok(encloses(arrival.play_area,arrival.overlays.player));
      assert.ok(arrival.overlays.captions.length>0,'actual Compton arrival supplies a visible world caption');
      for(const caption of arrival.overlays.captions){shortWalkingCaptionChecks++;assert.ok(!overlaps(caption,arrival.overlays.player),'real arrival caption leaves the enlarged player clear');}
      await page.screenshot({path:'artifacts/codex-small-hub-walking-caption-599x480-mouse.png'});await writeFile('artifacts/codex-small-hub-walking-caption-599x480-mouse.json',JSON.stringify(arrival,null,2));
    }
    await page.keyboard.press('KeyG');await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.block_hub_actions.length===4);await tap((await snapshot()).block_close_control);
    await page.waitForFunction(()=>!window.__tenderloinGodotA11ySnapshot.block_panel_control.visible&&window.__tenderloinGodotA11ySnapshot.following_player);await settle();const closed=await snapshot();assert.ok(closed.short_narrow_walking&&encloses(closed.play_area,closed.overlays.player),'hub Close alone restores the followed short walking view before Find Me');
    await tap((await snapshot()).walking_controls[2]);let s=await snapshot();const save=await page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1'));
    assert.ok(s.short_narrow_walking&&s.following_player&&!s.block_panel_control.visible&&s.play_area.height>=100&&s.overlays.player.width>0&&encloses(s.play_area,s.overlays.player),'Close and Find Me retain the full enlarged player and YOU in short walking space');
    assert.deepEqual(s.walking_controls.map(b=>b.text),["What's Next?",'Tenderloin Map','Find Me','Zoom In (+)','Zoom Out (−)','Walk & Talk (Next)']);
    for(const b of s.walking_controls)assert.ok(b.text_fits&&b.height>=50&&b.width>=44&&encloses({x:0,y:0,width,height},b),'full original walking labels and50px targets fit');
    await tap(s.walking_controls[1]);await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.in_wide_overview);await tap((await snapshot()).walking_controls[2]);
    await page.waitForFunction(()=>!window.__tenderloinGodotA11ySnapshot.in_wide_overview&&window.__tenderloinGodotA11ySnapshot.camera_view_size===45&&window.__tenderloinGodotA11ySnapshot.following_player);await settle();s=await snapshot();assert.equal(s.camera_view_size,45);assert.ok(encloses(s.play_area,s.overlays.player));assert.equal(await page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1')),save,'Close/Map/FindMe preserve progress');
    await page.keyboard.press('KeyH');await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.player_grounding.path_active);await settle();const moving=await snapshot();
    assert.equal(moving.walk_control_text,'Stop Walking');assert.ok(moving.walking_controls[5].text_fits&&encloses(moving.play_area,moving.overlays.player),'real routed walking stays framed above full Stop target');
    for(const caption of moving.overlays.captions){shortWalkingCaptionChecks++;assert.ok(!overlaps(caption,moving.overlays.player),'world captions leave short walking character clear');}
    const g=moving.overlays.guide_label;if(g.visible){shortWalkingGuideChecks++;assert.ok(!overlaps({x:g.x-7,y:g.y-7,width:g.width+14,height:g.height+14},moving.overlays.player),'outlined objective leaves the moving player clear');}
    assert.ok(Math.hypot(moving.player_grounding.x+424.5,moving.player_grounding.z-62.5)>200,'Stop fixture remains over200m from the actual Black Hawk destination');
    const stopSave=await page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1'));await tap(moving.walk_control);await page.waitForFunction(()=>!window.__tenderloinGodotA11ySnapshot.player_grounding.path_active&&window.__tenderloinGodotA11ySnapshot.announcement.startsWith('Walking stopped.'));
    const stopped=await snapshot();await settle();s=await snapshot();assert.ok(!s.player_grounding.path_active&&s.walk_control_text==='Walk & Talk (Next)');assert.equal(s.player_grounding.x,stopped.player_grounding.x);assert.equal(s.player_grounding.z,stopped.player_grounding.z);assert.equal(await page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1')),stopSave);
    await page.screenshot({path:`artifacts/codex-small-hub-walking-${width}x${height}-${touch?'touch':'mouse'}.png`});await writeFile(`artifacts/codex-small-hub-walking-${width}x${height}-${touch?'touch':'mouse'}.json`,JSON.stringify(s,null,2));
    const a=s.play_area,c=await page.locator('#canvas').boundingBox(),x=c.x+(a.x+a.width/2)*c.width/width,y=c.y+(a.y+a.height/2)*c.height/height;
    if(touch){const finger=await context.newCDPSession(page);await finger.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await finger.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+12*c.width/width,y:y+4*c.height/height,id:1}]});await finger.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await finger.detach();}
    else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+12*c.width/width,y+4*c.height/height,{steps:3});await page.mouse.up();}
    await settle();const manual=await snapshot();assert.ok(!manual.following_player);assert.notDeepEqual(manual.camera_pose,s.camera_pose);
    for(const size of [{width:519,height:360},{width:599,height:375},{width:599,height:560},{width:600,height:360},{width:560,height:560}]){await page.setViewportSize(size);await settle();assert.deepEqual((await snapshot()).camera_pose,manual.camera_pose,'short walking resize preserves real manual pan across mode boundaries');}
    await page.setViewportSize({width,height});await settle();await page.keyboard.press('KeyF');await settle();
    shortWalkingChecks.push({width,height,touch});
  }
}

async function verifyNarrowHub(page, context, touch) {
  const snapshot = () => page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
  const settle = async () => { const s = await snapshot(); await page.waitForFunction(f => window.__tenderloinGodotA11ySnapshot.ui_frame > f + 3 && !window.__tenderloinGodotA11ySnapshot.compact_panel_layout_pending, s.ui_frame); };
  const encloses = (a,b) => b.x >= a.x - 1 && b.y >= a.y - 1 && b.x + b.width <= a.x + a.width + 1 && b.y + b.height <= a.y + a.height + 1;
  const overlaps = (a,b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  async function tap(b) {
    const s = await snapshot(), cv = await page.locator('#canvas').boundingBox();
    assert.ok(b.visible && b.width >= 44 && b.height >= 44, 'narrow hub target is visible and44px');
    const x = cv.x + (b.x + b.width / 2) * cv.width / s.viewport_width, y = cv.y + (b.y + b.height / 2) * cv.height / s.viewport_height;
    if (touch) await page.touchscreen.tap(x,y); else await page.mouse.click(x,y);
    await settle();
  }
  const sizes = touch ? [[520,360],[559,360],[320,568],[599,360]] : [[520,360],[559,360],[320,568],[390,568],[560,360],[599,360],[560,568],[599,639]];
  for (const [width,height] of sizes) {
    await page.keyboard.press('KeyF');
    await page.setViewportSize({width,height});
    await settle();
    await page.keyboard.press('Digit1');
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot.conversation_detail.panel.visible && !window.__tenderloinGodotA11ySnapshot.player_grounding.path_active);
    await settle();
    const conversation = await snapshot(), save = await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1'));
    await tap(conversation.conversation_detail.buttons.find(b => b.visible && b.text === 'All Actions'));
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot.block_hub_actions.length === 4);
    let s = await snapshot();
    while (s.block_hub_page > 0) { await tap(s.block_page_previous); s = await snapshot(); }
    const seen = [], fullTitles=[];
    for (let p=0;p<3;p++) {
      await settle(); s = await snapshot();
      const screen = {x:0,y:0,width,height}, panel = s.block_panel_control;
      assert.equal(s.block_hub_side, width >= 520 && height < 560);
      assert.equal(s.compact_narrow_hub, !(width >= 520 && height < 560));
      assert.ok(s.following_player && encloses(screen,panel) && panel.y >= s.header_control.y + s.header_control.height + 7 && !overlaps(panel,s.controls_control), 'All Actions follows the player and clears the header and walking controls');
      assert.ok(s.play_area.width >= 200 && s.play_area.height >= 100 && s.overlays.player.width > 0 && encloses(s.play_area,s.overlays.player), 'narrow hub retains the full enlarged player and YOU');
      for (const b of [...s.block_hub_actions,s.block_page_previous,s.block_page_next,s.block_close_control]) assert.ok(b.width >= 44 && b.height >= 44 && encloses(panel,b), 'all narrow menu targets remain reachable');
      for (const b of s.block_hub_actions) { assert.ok(b.text_fits, `full narrow hub title: ${b.text}`); seen.push(b.id); fullTitles.push(b.text); }
      for (const b of s.walking_controls) assert.ok(b.width >= 44 && b.height >= 44 && b.text_fits && encloses(screen,b), 'compact walking targets fit');
      assert.equal(s.camera_view_size,conversation.camera_view_size);
      assert.equal(s.player_grounding.x,conversation.player_grounding.x); assert.equal(s.player_grounding.z,conversation.player_grounding.z);
      if (p !== 1) {
        await page.screenshot({path:`artifacts/codex-small-hub-${width}x${height}-${touch ? 'touch' : 'mouse'}-page${p+1}.png`});
        await writeFile(`artifacts/codex-small-hub-${width}x${height}-${touch ? 'touch' : 'mouse'}-page${p+1}.json`,JSON.stringify(s,null,2));
      }
      if (p<2) { await tap(s.block_page_next); assert.equal((await snapshot()).block_hub_page,p+1); }
    }
    assert.deepEqual(seen,Array.from({length:12},(_,i)=>i));
    if(width>=520&&width<560&&height<560){
      await page.setViewportSize({width:1100,height:760});await settle();
      const desktopTitles=(await snapshot()).block_hub_actions.sort((a,b)=>a.id-b.id).map(b=>b.text);assert.equal(desktopTitles.length,12);
      assert.deepEqual(fullTitles,desktopTitles,'small dock retains all twelve complete original desktop titles');await page.setViewportSize({width,height});await settle();s=await snapshot();while(s.block_hub_page<2){await tap(s.block_page_next);s=await snapshot();}
    }
    const cv = await page.locator('#canvas').boundingBox(), d = s.block_detail_control;
    const x = cv.x+(d.x+d.width/2)*cv.width/width, y = cv.y+(d.y+d.height/2)*cv.height/height;
    const overflowing=s.block_detail_scroll_max>s.block_detail_scroll_page;
    assert.ok(s.block_detail_text.startsWith('Bea:')&&s.block_detail_control.height>=19,'complete real dialogue retains a full font line');
    if(width>=520&&width<560&&height<560){assert.ok(overflowing,'small dock exercises actual overflowing dialogue');smallHubReaderChecks++;}
    if(overflowing){
    if (touch) {
      const finger = await context.newCDPSession(page);
      await finger.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
      await finger.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-12,id:1}]});
      await finger.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await finger.detach();
      await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot.block_detail_scroll_value > 0);
    }
    await page.mouse.move(x,y);
    for (let i=0;i<32;i++) { s=await snapshot(); if (s.block_detail_scroll_value+s.block_detail_scroll_page >= s.block_detail_scroll_max-1) break; await page.mouse.wheel(0,600); await settle(); }
    s=await snapshot(); assert.ok(s.block_detail_scroll_value+s.block_detail_scroll_page >= s.block_detail_scroll_max-1,'full description reaches final line');
    }
    await tap(s.info_control); s=await snapshot();
    assert.ok(s.header_details_expanded && s.info_reader.control.height >= 24 && encloses({x:0,y:0,width,height},s.block_panel_control) && s.block_panel_control.y >= s.header_control.y+s.header_control.height+7, 'expanded Info leaves menu and Close on-screen');
    assert.ok(s.info_reader.scroll_max > s.info_reader.scroll_page,'narrow Info contains overflowing complete source text');
    const ic=await page.locator('#canvas').boundingBox(), ir=s.info_reader.control;
    await page.mouse.move(ic.x+(ir.x+ir.width/2)*ic.width/width,ic.y+(ir.y+ir.height/2)*ic.height/height);
    for(let i=0;i<12;i++){const r=(await snapshot()).info_reader;if(r.scroll_value+r.scroll_page>=r.scroll_max-1)break;await page.mouse.wheel(0,1200);await settle();}
    const readInfo=(await snapshot()).info_reader;assert.ok(readInfo.scroll_value>0&&readInfo.scroll_value+readInfo.scroll_page>=readInfo.scroll_max-1,'actual wheel input reaches the complete Info final line');
    await tap(s.info_control);
    if(width===520){
      await settle();const before=await snapshot(),a=before.play_area,c=await page.locator('#canvas').boundingBox();
      const x=c.x+(a.x+a.width/2)*c.width/width,y=c.y+(a.y+a.height/2)*c.height/height;
      if(touch){const finger=await context.newCDPSession(page);await finger.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await finger.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+12*c.width/width,y:y+4*c.height/height,id:1}]});await finger.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await finger.detach();}
      else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+12*c.width/width,y+4*c.height/height,{steps:3});await page.mouse.up();}
      await settle();const manual=await snapshot();assert.ok(!manual.following_player);assert.notDeepEqual(manual.camera_pose,before.camera_pose);
      for(const size of [{width:519,height:360},{width:559,height:360},{width:560,height:360},{width:520,height:560},{width,height}]){await page.setViewportSize(size);await settle();const r=await snapshot();assert.deepEqual(r.camera_pose,manual.camera_pose,'small hub resize preserves actual manual inspection');assert.equal(r.block_hub_page,manual.block_hub_page);if(size.width>=520&&size.height<560){assert.ok(r.block_hub_side&&encloses({x:0,y:0,...size},r.block_panel_control)&&encloses(r.block_panel_control,r.block_close_control),'reentering the small side dock keeps the complete panel and Close on-screen');}}
      await tap((await snapshot()).block_close_control);assert.deepEqual((await snapshot()).camera_pose,manual.camera_pose,'small hub Close preserves manual camera');await page.keyboard.press('KeyF');await settle();await page.keyboard.press('KeyG');await settle();
    }
    if (width === 320) {
      for (const size of [{width:559,height:568},{width:560,height:559},{width:560,height:568},{width:599,height:639},{width:599,height:640},{width:600,height:360},{width,height}]) {
        await page.setViewportSize(size); await settle(); const r=await snapshot();
        assert.equal(r.block_hub_page,2,'open rotation retains the later hub page');
        assert.ok(r.block_hub_actions.some(b=>b.id===8) && encloses({x:0,y:0,...size},r.block_panel_control) && !overlaps(r.block_panel_control,r.controls_control) && r.block_panel_control.y >= r.header_control.y+r.header_control.height,'open hub breakpoint keeps focus page and controls reachable');
        assert.ok(encloses(r.play_area,r.overlays.player),'open hub breakpoint retains full enlarged player and YOU');
      }
    }
    await tap((await snapshot()).block_close_control);
    s=await snapshot(); assert.ok(!s.block_panel_control.visible);
    assert.deepEqual(s.walking_controls.map(b=>b.text),["What's Next?",'Tenderloin Map','Find Me','Zoom In (+)','Zoom Out (−)','Walk & Talk (Next)']);
    for (const b of s.walking_controls) assert.ok(b.height >= 50);
    assert.equal(await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1')),save,'hub reading/paging/Info/Close preserve progression');
    if (width === 320) {
      await page.keyboard.press('Digit1'); await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot.conversation_detail.panel.visible); await settle();
      const prior=await snapshot(), a=prior.play_area, cv=await page.locator('#canvas').boundingBox();
      await page.mouse.move(cv.x+(a.x+a.width/2)*cv.width/width,cv.y+(a.y+a.height/2)*cv.height/height);
      await page.mouse.down(); await page.mouse.move(cv.x+(a.x+a.width/2+12)*cv.width/width,cv.y+(a.y+a.height/2+4)*cv.height/height,{steps:3}); await page.mouse.up(); await settle();
      const manual=await snapshot(); assert.equal(manual.following_player,false); assert.notDeepEqual(manual.camera_pose,prior.camera_pose,'actual scene drag changes the camera pose');
      await tap(manual.conversation_detail.buttons.find(b=>b.visible&&b.text==='All Actions'));
      const hub=await snapshot(); assert.equal(hub.following_player,false); assert.deepEqual(hub.camera_pose,manual.camera_pose,'All Actions preserves manual camera inspection');
      await page.setViewportSize({width,height:600}); await settle(); assert.deepEqual((await snapshot()).camera_pose,manual.camera_pose,'manual view survives compact hub resize');
      await page.setViewportSize({width,height}); await settle(); await tap((await snapshot()).block_close_control);
    }
    if (touch && (width === 599 || width === 520)) {
      await page.keyboard.press('KeyF'); await page.keyboard.press('KeyH'); await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot.player_grounding.path_active);
      await page.keyboard.press('KeyG'); await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot.block_hub_side && window.__tenderloinGodotA11ySnapshot.walk_control_text==='Stop');
      const moving=await snapshot();assert.ok(Math.hypot(moving.player_grounding.x+424.5,moving.player_grounding.z-62.5)>200,'small hub Stop interrupts a still-distant real route');
      const stopSave=await page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1'));await tap(moving.walk_control); await page.waitForFunction(() => !window.__tenderloinGodotA11ySnapshot.player_grounding.path_active&&window.__tenderloinGodotA11ySnapshot.announcement.startsWith('Walking stopped.'));
      const stopped=await snapshot(); await settle(); const still=await snapshot();
      assert.equal(still.player_grounding.x,stopped.player_grounding.x); assert.equal(still.player_grounding.z,stopped.player_grounding.z);
      assert.equal(await page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1')),stopSave);assert.ok(still.block_hub_side&&encloses(still.block_panel_control,still.block_close_control),'finger Stop retains the side hub and reachable Close');
      await tap(still.walking_controls[1]); await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot.in_wide_overview);
      await tap((await snapshot()).walking_controls[2]); await page.waitForFunction(() => !window.__tenderloinGodotA11ySnapshot.in_wide_overview && window.__tenderloinGodotA11ySnapshot.camera_view_size===45);
    }
    narrowHubChecks.push({width,height,touch,actions:seen.length});
  }
}

async function verifyShortActivities(page, context, touch, checks, small = false) {
  const snapshot = () => page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
  const settle = async () => { const s = await snapshot(); await page.waitForFunction(f => window.__tenderloinGodotA11ySnapshot.ui_frame > f + 3 && !window.__tenderloinGodotA11ySnapshot.compact_panel_layout_pending, s.ui_frame); };
  async function tap(control) {
    const s = await snapshot(), canvas = await page.locator('#canvas').boundingBox();
    assert.ok(control.visible && control.width >= 44 && control.height >= 44, 'short activity target is visible and44px');
    const x = canvas.x + (control.x + control.width / 2) * canvas.width / s.viewport_width;
    const y = canvas.y + (control.y + control.height / 2) * canvas.height / s.viewport_height;
    if (touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
    await settle();
  }
  const sizes = small ? (touch ? [[520, 360], [559, 360], [320, 568], [599, 360]] : [[520, 360], [559, 360], [320, 568], [390, 568], [560, 360], [599, 360], [560, 568], [599, 639], [360, 600]]) : (touch ? [[640, 360], [844, 390]] : [[600, 360], [640, 360], [800, 480], [1100, 480]]);
  await page.keyboard.press('KeyF');
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await settle();
    for (const [kind, key, shortcut, hintId, closeId] of [['conversation', 'conversation_detail', 'Digit1', 1, 2], ['mural', 'mural_detail', 'KeyE', 7, 8], ['music', 'music_detail', 'KeyR', 5, 6]]) {
      await page.keyboard.press(shortcut);
      await page.waitForFunction(k => { const s = window.__tenderloinGodotA11ySnapshot; return s[k]?.panel.visible && !s.player_grounding.path_active; }, key, { timeout: 30000 });
      await settle();
      let s = await snapshot();
      await tap(s[key].buttons.find(b => b.id === hintId));
      s = await snapshot();
      assert.ok(s[key].text.length > 20, 'requested hint remains visible in the reader');
      for (let chat = 0; chat < 5 && (s[key].scroll_max <= s[key].scroll_page || s[key].text.length <= 100); chat++) {
        const before = await page.evaluate(() => JSON.parse(localStorage.getItem('tenderloin-redux.godot.save.v1')));
        await tap(s[key].buttons.find(b => b.id === (kind === 'music' ? 2 : 0)));
        const after = await page.evaluate(() => JSON.parse(localStorage.getItem('tenderloin-redux.godot.save.v1')));
        const next = await snapshot();
        if (kind === 'mural') assert.equal(after.celeste_talk_count, before.celeste_talk_count + 1, 'actual Chat advances once');
        else if (kind === 'conversation') assert.equal(Number(next.conversation_header.match(/Turn (\d)/)[1]), Number(s.conversation_header.match(/Turn (\d)/)[1]) % 5 + 1, 'actual Chat advances one visible turn');
        else assert.notEqual(next[key].text, s[key].text, 'actual Rook Chat changes the complete line');
        s = await snapshot();
      }
      if (kind === 'mural' && width >= 520 && width < 560 && height < 560) {
        for (const [id,name] of [[2,'sun'],[3,'wave'],[4,'rise']]) {
          await tap(s[key].buttons.find(b=>b.id===id)); s=await snapshot();
          const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('tenderloin-redux.godot.save.v1')));
          assert.ok(saved.mural_placements[name], 'actual motif button keeps its original placement callback');
          const b=s[key].buttons.find(b=>b.id===id), cell=saved.mural_placements[name];
          assert.equal(b.text,`>${name[0].toUpperCase()+name.slice(1)} ${cell.col},${cell.row}`);
          assert.ok(b.text_fits, 'selected placed motif retains its complete name, marker and coordinates');
        }
      }
      const d = s[key], a = s.play_area, p = d.panel, subject = s.panel_subject_screen;
      const side = !small || (width >= 520 && height < 560);
      assert.equal(s.side_panel_dock, side);
      if (small) assert.equal(s.compact_narrow_activity, !side);
      assert.equal(s.header_details_expanded, false, 'full dialogue is in the panel reader');
      assert.ok(a.width >= (small ? 200 : 250) && a.height >= 100 && (side ? p.x >= a.x + a.width : p.y >= a.y + a.height) && p.y >= s.header_control.y + s.header_control.height && p.y + p.height <= height - 12, 'dock clears header and keeps useful scene space');
      assert.ok(subject.x >= a.x && subject.x <= a.x + a.width && subject.y >= a.y && subject.y <= a.y + a.height, 'actual person or activity is framed in the remaining scene');
      const body = s.overlays.player;
      assert.ok(body.width > 0 && body.height > 0 && body.x >= a.x - 1 && body.y >= a.y - 1 && body.x + body.width <= a.x + a.width + 1 && body.y + body.height <= a.y + a.height + 1, 'full enlarged player and YOU clear short activity controls');
      assert.equal(s.panel_subject_points.length, kind === 'conversation' ? 1 : 2);
      for (const point of s.panel_subject_points) assert.ok(!point.behind && point.x >= a.x && point.x <= a.x + a.width && point.y >= a.y && point.y <= a.y + a.height, 'actual person and prop both remain visible');
      for (const b of d.buttons.filter(b => b.visible)) assert.ok(b.width >= 44 && b.height >= 44 && b.text_fits && b.x >= p.x && b.y >= p.y && b.x + b.width <= p.x + p.width + 1 && b.y + b.height <= p.y + p.height + 1, `complete short action fits: ${b.text}`);
      for (const b of s.walking_controls) assert.ok(b.width >= 44 && b.height >= 44 && b.text_fits && (side ? b.x + b.width <= p.x : b.y >= p.y + p.height), 'walking controls remain clear of the activity');
      assert.ok(d.scroll_max > d.scroll_page && d.text.length > 100, 'real requested hint or Chat line exercises complete scrolling');
      const save = await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1'));
      const canvas = await page.locator('#canvas').boundingBox();
      const x = canvas.x + (d.control.x + d.control.width / 2) * canvas.width / width;
      const y = canvas.y + (d.control.y + d.control.height - 4) * canvas.height / height;
      if (touch) {
        const cdp = await context.newCDPSession(page), travel = (d.control.height - 8) * canvas.height / height;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 0 }] });
        for (let step = 1; step <= 4; step++) {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - travel * step / 4, id: 0 }] });
          await page.waitForTimeout(20);
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await cdp.detach();
        await page.waitForFunction(k => window.__tenderloinGodotA11ySnapshot[k].scroll_value > 0, key);
      }
      await page.mouse.move(x, y - d.control.height / 2);
      for(let wheel=0;wheel<32;wheel++) {
        await page.mouse.wheel(0,400);await settle();const now=(await snapshot())[key];
        if(Math.abs(now.scroll_value+now.scroll_page-now.scroll_max)<1)break;
      }
      await page.waitForFunction(k=>{const d=window.__tenderloinGodotA11ySnapshot[k];return Math.abs(d.scroll_value+d.scroll_page-d.scroll_max)<1;},key,{timeout:10000});
      await page.mouse.click(x,y-d.control.height/2);
      const bottom=(await snapshot())[key].scroll_value;
      await page.keyboard.press('PageUp');
      await page.waitForFunction(({key,bottom})=>window.__tenderloinGodotA11ySnapshot[key].scroll_value<bottom,{key,bottom},{timeout:10000});
      const up=(await snapshot())[key].scroll_value;
      await page.keyboard.press('PageDown');
      await page.waitForFunction(({key,up})=>window.__tenderloinGodotA11ySnapshot[key].scroll_value>up,{key,up},{timeout:10000});
      await settle();
      const read = await snapshot();
      assert.equal(read[key].text, d.text);
      assert.deepEqual(read.camera_pose, s.camera_pose, 'reading never pans or rotates');
      assert.equal(read.camera_view_size, s.camera_view_size);
      assert.equal(read.player_grounding.x, s.player_grounding.x);
      assert.equal(read.player_grounding.z, s.player_grounding.z);
      assert.equal(await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1')), save, 'reading does not alter progress');
      await page.screenshot({ path: `artifacts/codex-${small && width >= 520 && width < 560 && height < 560 ? "small-landscape" : (small ? "narrow" : "short")}-activity-${kind}-${width}x${height}-${touch ? 'touch' : 'mouse'}.png` });
      await writeFile(`artifacts/codex-${small && width >= 520 && width < 560 && height < 560 ? "small-landscape" : (small ? "narrow" : "short")}-activity-${kind}-${width}x${height}-${touch ? 'touch' : 'mouse'}.json`, JSON.stringify(read, null, 2));
      checks.push({ kind, width, height, touch, scene: a, panel: p });
      for (const expanded of [true, false]) {
        await tap((await snapshot()).info_control);
        const grown = await snapshot(), dock = grown[key].panel, area = grown.play_area;
        assert.equal(grown.header_details_expanded, expanded);
        assert.ok(dock.y >= grown.header_control.y + grown.header_control.height && dock.y + dock.height <= height - 12, 'Info growth and shrink keep the entire dock on-screen');
        for (const point of grown.panel_subject_points) assert.ok(point.x >= area.x && point.x <= area.x + area.width && point.y >= area.y && point.y <= area.y + area.height, 'Info refit retains actual person and prop');
      }
      // Rotate with the activity open; automatic framing follows layout, manual pan does not.
      if (width === 640 || (small && (width === 320 || width === 520))) {
        for (const rotated of [...(width === 520 ? [{width:519,height:568},{width:520,height:559},{width:559,height:559},{width:560,height:559},{width:520,height:560}] : []), { width: 360, height: 640 }, { width: 599, height: 667 }, { width: 600, height: 559 }, { width: 600, height: 560 }, { width: 800, height: 600 }, { width, height }]) {
          await page.setViewportSize(rotated);
          await settle();
          const r = await snapshot(), point = r.panel_subject_screen, area = r.play_area;
          assert.ok(point.x >= area.x && point.x <= area.x + area.width && point.y >= area.y && point.y <= area.y + area.height, 'rotation retains the actual activity subject');
          const panel = r[key].panel, controls = r.controls_control;
          assert.ok(panel.y >= r.header_control.y + r.header_control.height && (r.side_panel_dock ? controls.x + controls.width <= panel.x : controls.y >= panel.y + panel.height), 'open rotation clears the header and walking controls');
        }
        const pan = await snapshot(), area = pan.play_area, cv = await page.locator('#canvas').boundingBox();
        const panX = cv.x + (area.x + area.width * 0.4) * cv.width / width, panY = cv.y + (area.y + area.height * 0.8) * cv.height / height;
        if (touch && width === 520) {
          const finger = await context.newCDPSession(page);
          await finger.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[{x:panX,y:panY,id:1}]});
          await finger.send('Input.dispatchTouchEvent', {type:'touchMove', touchPoints:[{x:panX+20*cv.width/width,y:panY+10*cv.height/height,id:1}]});
          await finger.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]}); await finger.detach();
        } else {
          await page.mouse.move(panX,panY); await page.mouse.down();
          await page.mouse.move(panX+20*cv.width/width,panY+10*cv.height/height,{steps:4}); await page.mouse.up();
        }
        await settle();
        const manual = await snapshot();
        assert.equal(manual.following_player, false);
        assert.notDeepEqual(manual.camera_pose, pan.camera_pose, 'real scene drag pans the camera');
        await page.setViewportSize({ width: 667, height: 375 }); await settle();
        assert.deepEqual((await snapshot()).camera_pose, manual.camera_pose, 'resize respects manual camera inspection');
        await page.setViewportSize({ width, height }); await settle();
        assert.deepEqual((await snapshot()).camera_pose, manual.camera_pose, 'returning to the small dock respects manual camera inspection');
      }
      const close = (await snapshot())[key].buttons.find(b => b.id === closeId);
      assert.match(close.text, /^(Close|Goodbye)$/);
      await tap(close);
      await page.waitForFunction(k => !window.__tenderloinGodotA11ySnapshot[k].panel.visible, key);
      const closed = await snapshot();
      assert.equal(closed.controls_control.width, width - 24, 'Close restores full walking controls');
      assert.deepEqual(closed.walking_controls.map(b => b.text), ["What's Next?", 'Tenderloin Map', 'Find Me', 'Zoom In (+)', 'Zoom Out (−)', 'Walk & Talk (Next)'], 'real Close restores every full walking caption');
      for (const b of closed.walking_controls) assert.ok(b.height >= 50, 'Close restores original walking target height');
    }
  }
}
async function verifyPassiveActivities(page,context,touch) {
  const snap=()=>page.evaluate(()=>window.__tenderloinGodotA11ySnapshot);
  const settle=async()=>{const s=await snap();await page.waitForFunction(f=>window.__tenderloinGodotA11ySnapshot.ui_frame>f+3&&!window.__tenderloinGodotA11ySnapshot.compact_panel_layout_pending,s.ui_frame);};
  const fits=(a,b)=>b.width>0&&b.x>=a.x-1&&b.y>=a.y-1&&b.x+b.width<=a.x+a.width+1&&b.y+b.height<=a.y+a.height+1;
  async function tap(b){const s=await snap(),c=await page.locator('#canvas').boundingBox();assert.ok(b.visible&&b.width>=44&&b.height>=44);const x=c.x+(b.x+b.width/2)*c.width/s.viewport_width,y=c.y+(b.y+b.height/2)*c.height/s.viewport_height;if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);await settle();}
  for(const width of [520,559]){
    await page.setViewportSize({width,height:360});await settle();
    for(const [kind,key,shortcut] of [['celeste','mural_detail','Digit2'],['rook','music_detail','Digit3'],['mural','mural_detail','KeyM']]){
      // Leave the previous arrival first; these keys then walk without a queued Chat/soundcheck.
      await page.keyboard.press('Digit1');await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.conversation_detail.panel.visible&&!window.__tenderloinGodotA11ySnapshot.player_grounding.path_active);
      await page.keyboard.press(shortcut);await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.player_grounding.path_active);
      await page.waitForFunction(k=>window.__tenderloinGodotA11ySnapshot[k].panel.visible&&!window.__tenderloinGodotA11ySnapshot.player_grounding.path_active,key,{timeout:30000});await settle();
      const s=await snap(),a=s.play_area,p=s[key].panel;
      assert.ok(s.side_panel_dock&&fits(a,s.overlays.player)&&s.panel_subject_points.length===2,'passive walking arrival frames the full player and both real subjects');
      for(const point of s.panel_subject_points)assert.ok(!point.behind&&point.x>=a.x&&point.x<=a.x+a.width&&point.y>=a.y&&point.y<=a.y+a.height);
      for(const b of s[key].buttons.filter(b=>b.visible))assert.ok(b.text_fits&&b.height>=44&&fits(p,b));
      await page.screenshot({path:`artifacts/codex-small-passive-${kind}-${width}x360-${touch?'touch':'mouse'}.png`});
      await writeFile(`artifacts/codex-small-passive-${kind}-${width}x360-${touch?'touch':'mouse'}.json`,JSON.stringify(s,null,2));
      // Real Close keeps progress and restores the established close walking view.
      const save=await page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1'));
      await tap(s[key].buttons.find(b=>b.id===(key==='mural_detail'?8:6)));
      assert.equal(await page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1')),save);
      const closed=await snap();
      assert.ok(closed.following_player&&closed.camera_view_size===45&&fits(closed.play_area,closed.overlays.player),'Close restores full player and YOU in the walking view');
      assert.equal(closed.player_grounding.x,s.player_grounding.x);assert.equal(closed.player_grounding.z,s.player_grounding.z);
      assert.equal(closed.music_playing,s.music_playing);
      passiveActivityChecks.push({width,height:360,touch,kind,scene:a});
    }
  }
}
let shortStartClicked = false;
let shortStartTouchClicked = false;
const browser = await chromium.launch({ channel: 'chrome', headless: true, ignoreDefaultArgs: ['--autoplay-policy=no-user-gesture-required'], args: ['--autoplay-policy=user-gesture-required'] });
const errors = [], external = [], runs = [];
let latestPage = null;
try {
  for (const size of [{ width: 1100, height: 760 }, { width: 390, height: 667 }, { width: 320, height: 667 }]) {
    const context = await browser.newContext({ viewport: size, hasTouch: size.width < 600 });
    await context.addInitScript((sentinel) => {
      if (window.localStorage.getItem('tenderloin-redux.save.v1') === null) {
        window.localStorage.setItem('tenderloin-redux.save.v1', sentinel);
      }
    }, BROWSER_SAVE_SENTINEL);
    context.on('request', r => { if (!r.url().startsWith(base) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) external.push(r.url()); });
    await context.addInitScript(() => {
      window.__tenderloinAudioContexts = [];
      for (const key of ['AudioContext', 'webkitAudioContext']) {
        if (typeof window[key] !== 'function') continue;
        window[key] = new Proxy(window[key], {
          construct(target, args, newTarget) {
            const audioContext = Reflect.construct(target, args, newTarget);
            window.__tenderloinAudioContexts.push(audioContext);
            return audioContext;
          }
        });
      }
    });
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
    async function clickActivityButton(key, id) {
      const frame = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot.ui_frame);
      await page.waitForFunction(f => window.__tenderloinGodotA11ySnapshot?.ui_frame > f, frame);
      const s = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
      const b = s[key].buttons.find(a => a.id === id);
      assert.ok(b?.visible && b.width >= 44 && b.height >= 44 && b.text_fits, 'activity button has a complete title and44px target');
      const canvas = await page.locator('#canvas').boundingBox();
      await page.mouse.click(canvas.x + (b.x + b.width / 2) * canvas.width / s.viewport_width, canvas.y + (b.y + b.height / 2) * canvas.height / s.viewport_height);
    }
    async function readActivityDetail(key, stage) {
      const frame = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot.ui_frame);
      await page.waitForFunction(f => window.__tenderloinGodotA11ySnapshot?.ui_frame > f + 2, frame);
      const readSave = await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1'));
      const s = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
      const d = s[key];
      assertReadableOverlays(s, `${s.viewport_width}px ${stage} activity`);
      if (stage === 'mural' || stage.startsWith('mural-') || stage === 'music' || stage.startsWith('music-')) {
        assert.equal(s.header_details_expanded, false, 'current activity instructions supersede stale speech without expanding Info');
        const p = s.overlays.player, a = s.play_area;
        assert.ok(p.x >= a.x && p.y >= a.y && p.x + p.width <= a.x + a.width && p.y + p.height <= a.y + a.height, 'the actual activity player and YOU reservation remain in the scene');
      }
      if (s.overlays.speech.in_activity) {
        assert.ok(d.text.includes(s.overlays.speech.text), 'the complete deferred dialogue remains in the existing activity instructions');
        assert.equal(s.header_details_expanded, false, 'repeated activity dialogue does not expand Info over the player');
      }
      assert.ok(d.control.visible && d.control.height >= d.min_height - 1 && d.control.height <= 50, 'description has a bounded two-line reading area at its actual font size');
      assert.ok(d.panel.y >= s.header_control.y + s.header_control.height && d.panel.y + d.panel.height <= s.controls_control.y, 'activity stays between header and walking controls');
      assert.ok(d.control.x >= d.panel.x && d.control.y >= d.panel.y && d.control.x + d.control.width <= d.panel.x + d.panel.width + 1 && d.control.y + d.control.height <= d.panel.y + d.panel.height + 1);
      for (const b of d.buttons) assert.ok(b.visible && b.width >= 44 && b.height >= 44 && b.text_fits, `full activity title: ${b.text}`);
      if (size.width < 600 && stage === 'mural') {
        assert.ok(d.scroll_max > d.scroll_page, 'narrow mural instructions must exercise scrolling');
        const canvas = await page.locator('#canvas').boundingBox();
        const x = canvas.x + (d.control.x + d.control.width / 2) * canvas.width / s.viewport_width;
        const y = canvas.y + (d.control.y + d.control.height - 4) * canvas.height / s.viewport_height;
        const travel = (d.control.height - 8) * canvas.height / s.viewport_height;
        const touch = await context.newCDPSession(page);
        await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 0 }] });
        for (let step = 1; step <= 4; step++) {
          await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - travel * step / 4, id: 0 }] });
          await page.waitForTimeout(20);
        }
        await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.waitForFunction(({key, start}) => window.__tenderloinGodotA11ySnapshot?.[key].scroll_value > start, {key, start: d.scroll_value});
        await touch.detach();
      }
      if (d.scroll_max > d.scroll_page) {
        const canvas = await page.locator('#canvas').boundingBox();
        await page.mouse.move(canvas.x + (d.control.x + d.control.width / 2) * canvas.width / s.viewport_width, canvas.y + (d.control.y + d.control.height / 2) * canvas.height / s.viewport_height);
        for (let wheelStep = 0; wheelStep < 32; wheelStep++) {
          await page.mouse.wheel(0, 400);
          const frame = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot.ui_frame);
          await page.waitForFunction(f => window.__tenderloinGodotA11ySnapshot?.ui_frame > f + 1, frame);
          const scroll = await page.evaluate(k => window.__tenderloinGodotA11ySnapshot[k], key);
          if (Math.abs(scroll.scroll_value - (scroll.scroll_max - scroll.scroll_page)) <= 1) break;
        }
        await page.waitForFunction(k => { const d = window.__tenderloinGodotA11ySnapshot?.[k]; return d && d.scroll_value > 0 && Math.abs(d.scroll_value - (d.scroll_max - d.scroll_page)) <= 1; }, key);
        await page.mouse.click(canvas.x + (d.control.x + d.control.width / 2) * canvas.width / s.viewport_width, canvas.y + (d.control.y + d.control.height / 2) * canvas.height / s.viewport_height);
        const bottom = await page.evaluate(k => window.__tenderloinGodotA11ySnapshot[k].scroll_value, key);
        await page.keyboard.press('PageUp');
        await page.waitForFunction(({key, bottom}) => window.__tenderloinGodotA11ySnapshot?.[key].scroll_value < bottom, {key, bottom});
        const beforeDown = await page.evaluate(k => window.__tenderloinGodotA11ySnapshot[k].scroll_value, key);
        await page.keyboard.press('PageDown');
        await page.waitForFunction(({key, beforeDown}) => window.__tenderloinGodotA11ySnapshot?.[key].scroll_value > beforeDown, {key, beforeDown});
        await page.waitForTimeout(160);
        const after = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
        assert.equal(after[key].text, d.text);
        assert.equal(after.camera_view_size, s.camera_view_size, 'reading does not zoom');
        assert.deepEqual(after.camera_pose, s.camera_pose, 'reading gestures never pan or rotate the camera');
        assert.equal(after.player_grounding.x, s.player_grounding.x);
        assert.equal(after.player_grounding.z, s.player_grounding.z);
        assert.ok(after[key].scroll_value > 0, 'unchanged refresh retains reading position');
      }
      assert.equal(await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1')), readSave, 'reading instructions leaves saved progress unchanged');
      await page.screenshot({ path: `artifacts/godot-${size.width}-${stage}-detail.png` });
    }
    const startup = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
    assert.equal(startup.music_playing, false, 'music waits for Start Exploring');
    assert.equal(startup.music_audio_playing, false);
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
    // Read the real startup card at short sizes before accepting it.
    if (size.width === 1100 || size.width === 320) {
      const readingSizes = size.width === 1100 ? [[640, 360], [667, 375], [844, 390], [800, 480], [320, 568], [599, 360], [520, 360]] : [[640, 360], [320, 568], [599, 360], [520, 360]];
      const storySave = await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1'));
      for (const [width, height] of readingSizes) {
        await page.setViewportSize({ width, height });
        await page.waitForFunction(v => { const s = window.__tenderloinGodotA11ySnapshot; return s?.viewport_width === v.width && s.viewport_height === v.height && s.story_detail.control.visible && s.layout_refit_pending === false; }, { width, height });
        const before = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
        const d = before.story_detail, start = before.start_control;

        assert.equal(before.music_toggle_control.disabled, true, 'pre-Start music remains locked after settled resize');
        assert.match(before.announcement, /^Chapter 1:/, 'resize preserves the chapter announcement');
        assert.ok(d.panel.x >= 0 && d.panel.y >= before.header_control.y + before.header_control.height && d.panel.x + d.panel.width <= width && d.panel.y + d.panel.height <= height, 'complete chapter card fits below header and inside short viewport');
        assert.ok(start.width >= 44 && start.height >= 44 && start.y >= d.panel.y && start.y + start.height <= height && start.x + start.width <= width, 'short-screen Start has a complete on-screen44px target');
        assert.ok(d.text.includes('your neighbors have already started planning') && d.text.includes('the streets and the history are real'), 'the complete original introduction is retained');
        const canvas = await page.locator('#canvas').boundingBox();
        const x = canvas.x + (d.control.x + d.control.width / 2) * canvas.width / width;
        const y = canvas.y + (d.control.y + d.control.height / 2) * canvas.height / height;

        if (!shortStoryReadChecks.some(r => r.context_width === size.width)) {
          assert.ok(before.story_start_focus, 'the first PageDown case begins at the real Start target');
          await page.keyboard.press('PageDown');
          await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot.story_reading_focus && window.__tenderloinGodotA11ySnapshot.story_detail.scroll_value > 0);
          await page.keyboard.press('Home');
          await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot.story_detail.scroll_value === 0);
        }
        const music = before.music_toggle_control;
        const mx = canvas.x + (music.x + music.width / 2) * canvas.width / width;
        const my = canvas.y + (music.y + music.height / 2) * canvas.height / height;
        if (size.width === 320) await page.touchscreen.tap(mx, my);
        else await page.mouse.click(mx, my);
        await page.waitForFunction(f => window.__tenderloinGodotA11ySnapshot.ui_frame > f + 3, before.ui_frame);
        const locked = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
        assert.ok(locked.startup_pending && locked.music_toggle_control.disabled && !locked.music_playing && !locked.music_audio_playing, 'a real tap/click cannot bypass Start through the locked Music button');
        const scrolling = d.scroll_max > d.scroll_page + 1;
        if (width === 640 && height === 360) assert.ok(scrolling, 'the landscape reading test really exercises overflow');
        if (scrolling) {
          await page.mouse.move(x, y);
          await page.mouse.wheel(0, 400);
          await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot.story_detail.scroll_value > 0);
          await page.mouse.click(x, y);
          await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot.story_reading_focus);
          await page.keyboard.press('End');
          await page.waitForFunction(() => {const d = window.__tenderloinGodotA11ySnapshot.story_detail; return Math.abs(d.scroll_value - d.scroll_max + d.scroll_page) < 0.01;});
          const end = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
          await page.waitForFunction(f => window.__tenderloinGodotA11ySnapshot.ui_frame > f + 2, end.ui_frame);
          const retained = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
          assert.ok(retained.ui_frame > end.ui_frame && Math.abs(retained.story_detail.scroll_value - end.story_detail.scroll_value) < 1, 'new layout frames preserve the reading position');
          await page.keyboard.press('Home');
          await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot.story_detail.scroll_value === 0);
          await page.keyboard.press('PageDown');
          await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot.story_reading_focus && window.__tenderloinGodotA11ySnapshot.story_detail.scroll_value > 0);
          await page.keyboard.press('Home');
          await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot.story_detail.scroll_value === 0);
          await page.keyboard.press('ArrowDown');
          await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot.story_detail.scroll_value > 0);
          if (size.width === 320) {
            await page.keyboard.press('Home');
            await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot.story_detail.scroll_value === 0);
            const finger = await context.newCDPSession(page);
            await finger.send('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[{x,y}]});
            await finger.send('Input.dispatchTouchEvent', {type:'touchMove',touchPoints:[{x,y:y-12}]});
            await finger.send('Input.dispatchTouchEvent', {type:'touchMove',touchPoints:[{x,y:y-24}]});
            await finger.send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
            await finger.detach();
            await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot.story_detail.scroll_value > 0);
          }
        }
        const after = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
        assert.ok(after.startup_pending && after.story_detail.control.visible && after.music_toggle_control.disabled && !after.music_playing && !after.music_audio_playing, 'navigation reading never accepts startup or starts music');
        assert.ok(after.reward_audio_unlocked && !after.reward_audio_playing && after.reward_sound_count === 0, 'reading is real effect-unlock input without playing a reward');
        assert.deepEqual(after.camera_pose, before.camera_pose, 'chapter reading preserves camera pose');
        assert.equal(after.camera_view_size, before.camera_view_size, 'chapter reading preserves zoom');
        assert.equal(after.player_grounding.x, before.player_grounding.x);
        assert.equal(after.player_grounding.z, before.player_grounding.z);
        assert.equal(await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1')), storySave, 'chapter reading leaves saved progress unchanged');
        shortStoryReadChecks.push({ context_width:size.width, width, height, scrolling, touch:size.width === 320 && scrolling });
        await page.screenshot({path:`artifacts/godot-story-${size.width}-${width}x${height}.png`});
      }
      if (size.width === 1100 || size.width === 320) {
        await page.setViewportSize({width:640,height:360});
        await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot.viewport_width === 640 && window.__tenderloinGodotA11ySnapshot.viewport_height === 360 && window.__tenderloinGodotA11ySnapshot.layout_refit_pending === false);
        const consentBefore = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
        if (size.width === 320) {
          const canvas = await page.locator('#canvas').boundingBox(), b = consentBefore.start_control;
          await page.touchscreen.tap(canvas.x + (b.x + b.width / 2) * canvas.width / 640, canvas.y + (b.y + b.height / 2) * canvas.height / 360);
          shortStartTouchClicked = true;
        } else await clickHeaderControl('start_control');
        await page.waitForFunction(() => !window.__tenderloinGodotA11ySnapshot.startup_pending && window.__tenderloinGodotA11ySnapshot.music_playing);
        const accepted = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
        assert.ok(!accepted.story_detail.panel.visible && !accepted.in_overview && accepted.camera_view_size <= 58, 'actual short-screen Start accepts and frames walking');
        assert.equal(accepted.player_grounding.x, consentBefore.player_grounding.x);
        assert.equal(accepted.player_grounding.z, consentBefore.player_grounding.z);
        assert.equal(await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1')), storySave);
        await page.screenshot({path:`artifacts/godot-story-${size.width}-640x360-started.png`});
        shortStartClicked = true;
        await clickHeaderControl('music_toggle_control');
        await page.reload();
        await page.locator('#status').waitFor({state:'hidden',timeout:60000});
        await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.startup_pending);
      }
      await page.setViewportSize(size);
      await page.waitForFunction(v => {const s=window.__tenderloinGodotA11ySnapshot;return s.viewport_width===v.width && s.viewport_height===v.height && s.layout_refit_pending === false;}, size);
      if (size.width === 320) {
        if (!(await page.evaluate(() => window.__tenderloinGodotA11ySnapshot.story_start_focus))) await page.keyboard.press('Tab');
        await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot.story_start_focus);
      }
    }
    if (size.width === 320) await page.keyboard.press('Enter');
    else await clickHeaderControl('start_control');
    await page.waitForFunction(() => !window.__tenderloinGodotA11ySnapshot?.in_overview && window.__tenderloinGodotA11ySnapshot?.camera_view_size <= 58);
    const oriented = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
    assert.equal(oriented.reward_audio_unlocked, true);
    assert.equal(oriented.music_playing, true, 'Start Exploring enables the original soundtrack');
    assert.equal(oriented.music_volume, 0.7);
    assert.match(oriented.announcement, /^You're here/);
    assert.equal(oriented.music_toggle_text, 'Music: On');
    await page.waitForFunction(() => window.__tenderloinAudioContexts.some(ctx => ctx.state === 'running'));
    await page.waitForFunction(() => {
      const s = window.__tenderloinGodotA11ySnapshot;
      return s?.music_audio_playing && s.music_buffer_ready && s.music_sample_rms > 0;
    });
    assert.ok(oriented.cutaway_additions > 0, 'newer foreground buildings must fade for the starting character');
    assert.ok(oriented.player_screen.x >= oriented.play_area.x && oriented.player_screen.x <= oriented.play_area.x + oriented.play_area.width && oriented.player_screen.y >= oriented.play_area.y && oriented.player_screen.y <= oriented.play_area.y + oriented.play_area.height, 'Start frames the actual avatar inside the playable scene');
    assert.match(oriented.progress_text, /Sparks: 0 · Keepsakes: 0\/10/);
    await page.screenshot({ path: `artifacts/godot-${size.width}-start-oriented.png` });
    // A touch-reachable header control pauses without a trip to Rook or opening a panel.
    await clickHeaderControl('music_toggle_control');
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.music_playing === false);
    assert.equal((await page.evaluate(() => window.__tenderloinGodotA11ySnapshot)).music_audio_playing, false);
    assert.equal((await page.evaluate(() => window.__tenderloinGodotA11ySnapshot)).reward_sounds_enabled, true);
    await clickHeaderControl('music_toggle_control');
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.music_playing === true);
    await page.keyboard.press('KeyK');
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.music_playing === false);
    await page.keyboard.press('Escape');
    await page.keyboard.press('KeyF');
    await page.waitForTimeout(150);
    assert.equal((await page.evaluate(() => window.__tenderloinGodotA11ySnapshot)).music_playing, false, 'Find Me preserves paused music');
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
    // Wait for a stable arrival, then use real walking input into an actual
    // light pool. A fast route can cross its center between published snapshots.
    await page.waitForFunction(() => {
      const s = window.__tenderloinGodotA11ySnapshot, raw = localStorage.getItem('tenderloin-redux.godot.save.v1');
      return s?.evening_mode && !s.player_grounding.path_active && raw && JSON.parse(raw).visited_neighbors.includes('thanh');
    }, null, { timeout: 35000 });
    await page.keyboard.press('KeyF');
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot.active_panel === 'none');
    for (let pulse = 0; pulse < 16; pulse++) {
      const s = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot), p = s.player_grounding;
      if (p.nearest_light_pool_distance < 1.1) break;
      const dx = p.nearest_light_pool_x - p.x, dz = p.nearest_light_pool_z - p.z;
      assert.ok(Number.isFinite(dx) && Number.isFinite(dz), 'light-pool destination comes from actual scene data');
      // Convert the desired world direction back through the current yaw.
      const yaw = s.camera_pose.yaw, ix = dx * Math.cos(yaw) - dz * Math.sin(yaw), iz = dx * Math.sin(yaw) + dz * Math.cos(yaw);
      const key = Math.abs(ix) > Math.abs(iz) ? (ix > 0 ? 'KeyD' : 'KeyA') : (iz > 0 ? 'KeyS' : 'KeyW');
      await page.keyboard.down(key);
      await page.waitForTimeout(100);
      await page.keyboard.up(key);
      const releasedFrame = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot.ui_frame);
      await page.waitForFunction(f => window.__tenderloinGodotA11ySnapshot.ui_frame > f + 2, releasedFrame);
    }
    await page.waitForFunction(() => {
      const s = window.__tenderloinGodotA11ySnapshot;
      return s.evening_mode && !s.player_grounding.path_active && s.player_grounding.stride < 0.1 && s.player_grounding.nearest_light_pool_distance < 1.3;
    });
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
    await clickActivityButton('mural_detail', 2);
    await page.waitForTimeout(120);
    await clickActivityButton('mural_detail', 3);
    await page.waitForTimeout(120);
    await clickActivityButton('mural_detail', 4);
    await page.waitForTimeout(120);
    await clickActivityButton('mural_detail', 1);
    await page.waitForTimeout(250);
    const muralShot = await page.screenshot({ path: `artifacts/godot-${size.width}-mural.png` });
    assert.notDeepEqual(neighbor, muralShot, `Portable mural panel and motif placement must visibly update canvas at ${size.width}`);
    await readActivityDetail('mural_detail', 'mural');
    if (size.width === 1100) {
      for (const width of [600, 800, 1000]) {
        await page.setViewportSize({ width, height: 667 });
        await page.waitForFunction(w => window.__tenderloinGodotA11ySnapshot?.viewport_width === w, width);
        await readActivityDetail('mural_detail', `mural-${width}`);
      }
      await page.setViewportSize(size);
      await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.viewport_width === 1100);
    }
    const beforeMuralClose = await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1'));
    const waitingReward = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
    if (waitingReward.overlays.reward.remaining > 0 && !waitingReward.overlays.reward.visible && !waitingReward.header_details_expanded) {
      queuedActivityRewardChecks++;
      await page.waitForFunction(frame => window.__tenderloinGodotA11ySnapshot.ui_frame > frame + 3, waitingReward.ui_frame);
      await page.waitForTimeout(1100);
      const stillWaiting = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
      assert.ok(stillWaiting.ui_frame > waitingReward.ui_frame, 'queued timer comparison uses a fresh published snapshot');
      assert.equal(stillWaiting.overlays.reward.remaining, waitingReward.overlays.reward.remaining, 'a crowded activity retains the complete reward reading time');
      assert.deepEqual(stillWaiting.camera_pose, waitingReward.camera_pose, 'waiting for reward space preserves manual camera intent');
    }
    await clickActivityButton('mural_detail', 8);
    await page.waitForFunction(() => !window.__tenderloinGodotA11ySnapshot?.mural_detail.control.visible);
    if (waitingReward.overlays.reward.remaining > 0 && !waitingReward.overlays.reward.visible && !waitingReward.header_details_expanded) {
      await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.overlays.reward.visible);
      const releasedReward = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
      assert.ok(releasedReward.overlays.reward.remaining > 2.5, 'closing the real activity releases its queued reward with reading time');
      assertReadableOverlays(releasedReward, `${size.width}px queued mural reward after Close`);
      await page.screenshot({ path: `artifacts/godot-${size.width}-reward-after-activity.png` });
    }
    assert.equal(await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1')), beforeMuralClose);
    // Press KeyR to walk to Rook on Turk Street and run soundcheck on arrival
    await page.keyboard.press('KeyR');
    await page.waitForFunction(() => {
      const raw = window.localStorage.getItem('tenderloin-redux.godot.save.v1');
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return parsed.rook_soundcheck_done === true;
    }, null, { timeout: 30000 });
    await page.waitForTimeout(200);
    // Resume the explicitly paused procedural sketch on Rook's speaker.
    await page.keyboard.press('KeyK');
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.music_playing === true);
    await page.waitForTimeout(250);
    const musicShot = await page.screenshot({ path: `artifacts/godot-${size.width}-music.png` });
    assert.notDeepEqual(muralShot, musicShot, `Rook soundcheck and MusicPanel playback must visibly update canvas at ${size.width}`);
    await readActivityDetail('music_detail', 'music');
    if (size.width === 1100) {
      for (const width of [600, 800, 1000]) {
        await page.setViewportSize({ width, height: 667 });
        await page.waitForFunction(w => window.__tenderloinGodotA11ySnapshot?.viewport_width === w, width);
        await readActivityDetail('music_detail', `music-${width}`);
      }
      await page.setViewportSize(size);
      await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.viewport_width === 1100);
    }
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
    assert.match((await page.evaluate(() => window.__tenderloinGodotA11ySnapshot)).music_detail.text, /suno-browser-test\.wav/, 'full local filename stays reachable in the description');
    await readActivityDetail('music_detail', 'local-track');
    const auditionShot = await page.screenshot();
    assert.notDeepEqual(musicShot, auditionShot, `Local WAV audition must visibly update MusicPanel status at ${size.width}`);
    await page.evaluate(() => window.__tenderloinQueueLocalAudioBase64('corrupt.wav', window.btoa('not-a-valid-riff-wav'), ''));
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.music_detail.text === 'Could not decode audio file. Sketch remains available.');
    await readActivityDetail('music_detail', 'audio-error');
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
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.music_playing === false);
    await page.waitForTimeout(150);
    const beforeMusicClose = await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1'));
    await clickActivityButton('music_detail', 6);
    await page.waitForFunction(() => !window.__tenderloinGodotA11ySnapshot?.music_detail.control.visible);
    assert.equal(await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1')), beforeMusicClose);
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
      const { player, speech, reward, talk, guide_label, captions } = snap.overlays;
      const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
      const area = snap.play_area;
      const contained = r => r.x >= area.x - 1 && r.y >= area.y - 1 && r.x + r.width <= area.x + area.width + 1 && r.y + r.height <= area.y + area.height + 1;
      const occupied = [];
      for (const [name, rect] of [['reward', reward], ['speech', speech], ['talk', talk], ['guide', guide_label], ...captions.map(c => [c.id, c])]) {
        if (['speech', 'reward', 'talk', 'guide'].includes(name) && !rect.visible) continue;
        const outlined = name === 'guide' ? { ...rect, x: rect.x - 6, y: rect.y - 6, width: rect.width + 12, height: rect.height + 12 } : rect;
        assert.ok(contained(outlined), `${context}: ${name} fits the play area`);
        if (name === 'speech' || name === 'reward') assert.ok(!overlaps(rect, player), `${context}: ${name} clears the player's body and YOU marker`);
        for (const [other, previous] of occupied) assert.ok(!overlaps(outlined, previous), `${context}: ${name} must clear ${other}`);
        occupied.push([name, outlined]);
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
    // Actual inspection -> keyboard walk -> routed walk, after existing save checks.
    await page.keyboard.press('Escape');
    // Exercise a real longer museum heading after the reload, at a fresh layout frame.
    await page.keyboard.press('Shift+KeyM');
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.overlays.reward_title.text.includes('Archive Time-Portal'));
    const museumFrame = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot.ui_frame);
    await page.waitForFunction(frame => {
      const s = window.__tenderloinGodotA11ySnapshot;
      return s?.ui_frame > frame && s.overlays.reward.visible && s.overlays.reward_title.visible;
    }, museumFrame);
    const museumHeading = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot.overlays.reward_title);
    assert.ok(museumHeading.lines > 0 && museumHeading.visible_lines === museumHeading.lines, 'entire actual museum reward heading is visible after layout');
    if (size.width === 320) assert.ok(museumHeading.lines > 1, 'actual long heading wraps on the narrowest phone');
    await page.screenshot({ path: `artifacts/godot-${size.width}-wrapped-reward-title.png` });
    await page.keyboard.press('Shift+KeyH');
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.camera_view_size === 84 && !window.__tenderloinGodotA11ySnapshot.following_player);
    const inspectionFrame = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot.ui_frame);
    await page.waitForFunction(frame => {
      const s = window.__tenderloinGodotA11ySnapshot;
      return s?.ui_frame > frame && s.overlays.reward.visible && s.overlays.reward_title.visible;
    }, inspectionFrame);
    const inspection = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
    assert.equal(inspection.overlays.reward_title.text, "* Found 'So What'!");
    assert.ok(inspection.overlays.reward.visible && inspection.overlays.reward_title.visible, 'actual So What reward remains visible');
    assert.equal(inspection.overlays.reward_title.visible_lines, inspection.overlays.reward_title.lines, 'entire reward title is visible');
    const resumeSave = await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1'));
    const resumeLegacySave = await page.evaluate(() => localStorage.getItem('tenderloin-redux.save.v1'));
    await page.screenshot({ path: `artifacts/godot-${size.width}-detached-inspection.png` });
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(200);
    await page.keyboard.up('KeyW');
    await page.waitForFunction(frame => {
      const s = window.__tenderloinGodotA11ySnapshot;
      return s?.ui_frame > frame && s.following_player && s.camera_view_size === 45;
    }, inspection.ui_frame);
    const resumed = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
    assert.ok(resumed.overlays.talk.visible && resumed.overlays.guide_label.visible, 'Talk and objective name both remain visible');
    assertReadableOverlays(resumed, 'manual resume beside Bea');
    const resumeDistance = Math.hypot(resumed.player_grounding.x - inspection.player_grounding.x, resumed.player_grounding.z - inspection.player_grounding.z);
    assert.ok(resumeDistance > 0.05 && resumeDistance < 8, 'manual resume visibly moves by real walking, not teleportation');
    assert.ok(resumed.player_screen.x >= resumed.play_area.x && resumed.player_screen.x <= resumed.play_area.x + resumed.play_area.width && resumed.player_screen.y >= resumed.play_area.y && resumed.player_screen.y <= resumed.play_area.y + resumed.play_area.height, 'resuming frames the actual player inside the play area');
    assert.equal(await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1')), resumeSave, 'manual resume leaves saved progress unchanged');
    await page.screenshot({ path: `artifacts/godot-${size.width}-inspection-resume-walk.png` });
    await page.keyboard.press('Shift+KeyH');
    await page.waitForFunction(() => !window.__tenderloinGodotA11ySnapshot?.following_player && window.__tenderloinGodotA11ySnapshot.camera_view_size === 84);
    await page.keyboard.press('KeyH');
    await page.waitForFunction(() => {
      const s = window.__tenderloinGodotA11ySnapshot;
      return s?.following_player && s.camera_view_size === 45 && s.player_grounding.path_active;
    });
    await page.screenshot({ path: `artifacts/godot-${size.width}-inspection-resume-route.png` });
    await clickHeaderControl('walk_control');
    await page.waitForFunction(() => !window.__tenderloinGodotA11ySnapshot?.player_grounding.path_active);
    assert.equal(await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1')), resumeSave, 'route start and Stop preserve saved progress');
    assert.equal(await page.evaluate(() => localStorage.getItem('tenderloin-redux.save.v1')), resumeLegacySave);
    // Review the secondary action hub using actual paging, wheel and button input.
    await page.keyboard.press('Escape');
    await page.keyboard.press('KeyG');
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.block_panel_control.visible && window.__tenderloinGodotA11ySnapshot?.block_hub_actions.length > 0);
    const openedHub = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
    if (openedHub.block_hub_paged) {
      for (let priorPage = openedHub.block_hub_page; priorPage > 0; priorPage--) {
        await clickHeaderControl('block_page_previous');
        await page.waitForFunction(expected => window.__tenderloinGodotA11ySnapshot?.block_hub_page === expected, priorPage - 1);
      }
    }
    const hubSave = await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1'));
    const hubOrigin = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot.player_grounding);
    const hubSeen = [];
    for (let hubPage = 0; hubPage < (openedHub.block_hub_paged ? openedHub.block_hub_pages : 1); hubPage++) {
      await page.waitForFunction(expected => window.__tenderloinGodotA11ySnapshot?.block_hub_page === expected, hubPage);
      const fresh = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot.ui_frame);
      await page.waitForFunction(frame => window.__tenderloinGodotA11ySnapshot?.ui_frame > frame, fresh);
      const hub = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
      assert.equal(hub.block_hub_actions.length, openedHub.block_hub_paged ? 4 : 12);
      assert.ok(hub.block_close_control.visible, 'Close stays visible on every page');
      for (const action of [...hub.block_hub_actions, hub.block_close_control]) {
        assert.ok(action.width >= 44 && action.height >= 44, 'hub controls have 44px targets');
        assert.ok(action.x >= hub.block_panel_control.x && action.y >= hub.block_panel_control.y && action.x + action.width <= hub.block_panel_control.x + hub.block_panel_control.width + 1 && action.y + action.height <= hub.block_panel_control.y + hub.block_panel_control.height + 1, 'hub controls stay inside the bounded panel');
      }
      for (const action of hub.block_hub_actions) {
        assert.equal(action.text_fits, true, `complete title fits: ${action.text}`);
        hubSeen.push(action.id);
      }
      assert.ok(hub.block_panel_control.y >= hub.header_control.y + hub.header_control.height && hub.block_panel_control.y + hub.block_panel_control.height <= hub.controls_control.y, 'hub preserves header and walking controls');
      await page.screenshot({ path: `artifacts/godot-${size.width}-action-page-${hubPage + 1}.png` });
      if (openedHub.block_hub_paged && hubPage < openedHub.block_hub_pages - 1) await clickHeaderControl('block_page_next');
    }
    assert.deepEqual(hubSeen, Array.from({ length: 12 }, (_, i) => i), 'every hub action remains reachable in order');
    assert.equal(await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1')), hubSave, 'paging does not change progress');
    if (openedHub.block_hub_paged) {
      await clickHeaderControl('block_page_next');
      await page.waitForTimeout(100);
      assert.equal((await page.evaluate(() => window.__tenderloinGodotA11ySnapshot)).block_hub_page, 2, 'Next clamps at the final page');
      await clickHeaderControl('block_page_previous');
      await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.block_hub_page === 1);
      const longDetail = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
      assert.match(longDetail.block_detail_text, /Imported browser v1 save:/, 'the real imported-save fixture supplies a long description');
      assert.ok(longDetail.block_detail_scroll_max > longDetail.block_detail_scroll_page, 'long real hub details remain scrollable');
      const hubCanvas = await page.locator('#canvas').boundingBox();
      await page.mouse.move(hubCanvas.x + (longDetail.block_detail_control.x + longDetail.block_detail_control.width / 2) * hubCanvas.width / longDetail.viewport_width, hubCanvas.y + (longDetail.block_detail_control.y + longDetail.block_detail_control.height / 2) * hubCanvas.height / longDetail.viewport_height);
      await page.mouse.wheel(0, 600);
      await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.block_detail_scroll_value > 0);
      const scrolledHub = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
      assert.equal(scrolledHub.camera_view_size, longDetail.camera_view_size, 'reading details does not zoom the camera');
      assert.equal(scrolledHub.player_grounding.x, hubOrigin.x);
      assert.equal(scrolledHub.player_grounding.z, hubOrigin.z);
      await page.screenshot({ path: `artifacts/godot-${size.width}-action-detail-scroll.png` });
    }
    await clickHeaderControl('block_close_control');
    await page.waitForFunction(() => !window.__tenderloinGodotA11ySnapshot?.block_panel_control.visible);
    assert.equal(await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1')), hubSave, 'paging, reading and closing leave progress unchanged');
    // Activate a real action from the final phone page, then restore its prior setting.
    await page.keyboard.press('KeyG');
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.block_panel_control.visible);
    const reopenedHub = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
    if (reopenedHub.block_hub_paged) {
      for (let nextPage = reopenedHub.block_hub_page + 1; nextPage < reopenedHub.block_hub_pages; nextPage++) {
        await clickHeaderControl('block_page_next');
        await page.waitForFunction(expected => window.__tenderloinGodotA11ySnapshot?.block_hub_page === expected, nextPage);
      }
    }
    const districtBeforeHub = await page.evaluate(() => JSON.parse(localStorage.getItem('tenderloin-redux.godot.save.v1')).district_boundary_visible);
    for (const districtWanted of [!districtBeforeHub, districtBeforeHub]) {
      const actionSnap = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
      const districtAction = actionSnap.block_hub_actions.find(a => a.id === 10);
      assert.ok(districtAction?.visible, 'final-page district action remains visible');
      const actionCanvas = await page.locator('#canvas').boundingBox();
      await page.mouse.click(actionCanvas.x + (districtAction.x + districtAction.width / 2) * actionCanvas.width / actionSnap.viewport_width, actionCanvas.y + (districtAction.y + districtAction.height / 2) * actionCanvas.height / actionSnap.viewport_height);
      await page.waitForFunction(value => JSON.parse(localStorage.getItem('tenderloin-redux.godot.save.v1')).district_boundary_visible === value, districtWanted);
    }
    await clickHeaderControl('block_close_control');
    await page.waitForFunction(() => !window.__tenderloinGodotA11ySnapshot?.block_panel_control.visible);
    const explorationEvidence = { activityDetailReadabilityVerified: true, activityTouchDragVerified: size.width < 600, activityKeyboardScrollVerified: true, readableHubActionsVerified: true, boundedHubDetailsVerified: true, defaultMusicOnVerified: true, runningAudioContextVerified: true, touchMusicToggleVerified: true, readableRewardAndGuideVerified: true, inspectionResumeVerified: true, walkingStopControlVerified: true, compactHeaderHeight: startup.header_control.height, compactInfoToggleVerified: true, startupOrientationVerified: true, findMeAndMapVerified: true, rewardSoundsAndMuteVerified: true, persistentProgressVerified: true, surpriseDiscoveryVerified: true, surpriseKeepsakeReloadVerified: true, chapter6ConversationVerified: true, sessionLandmarkTourVerified: true, fullSaveBytes: Buffer.byteLength(saveBeforeTour, 'utf8') };
    runs.push({ ...explorationEvidence, viewport: size, overviewBytes: before.length, selectedBytes: after.length, neighborBytes: neighbor.length, muralBytes: muralShot.length, musicBytes: musicShot.length, blockBytes: blockShot.length, blackhawkBytes: blackhawkShot.length, wideBytes: wideShot.length, keyboardActivationVerified: true, neighborWalkVerified: true, muralSaveReloadVerified: true, rookMusicAuditionVerified: true, blockCompletionVerified: true, widerTenderloinVerified: true, m1EpilogueVerified: true, m3HostingVerified: true, m4CivicFilmVerified: true, m5VoicesIsolatedVerified: true, m6KeepsakeSvgExportVerified: true, m6PerfBudgetVerified: true, perfSnapshot: perfSnap, browserSaveImportVerified: true, domA11yLiveVerified: true });
    if (size.width === 1100) {
      const sweepSave = await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1'));
      await page.keyboard.press('KeyF');
      await page.keyboard.press('KeyG');
      let previousPaged = false;
      let sweepPlayer = null;
      let sweepZoom = null;
      for (const width of [1000, 900, 800, 700, 600, 599, 1049, 1050, 1100]) {
        await page.setViewportSize({ width, height: 667 });
        await page.waitForFunction(w => window.__tenderloinGodotA11ySnapshot?.viewport_width === w, width);
        const resizeFrame = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot.ui_frame);
        await page.waitForFunction(f => window.__tenderloinGodotA11ySnapshot?.ui_frame > f + 2, resizeFrame);
        const resized = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
        assert.equal(resized.block_hub_paged, width < 1050, 'tablet paging is independent of the phone layout');
        if (previousPaged && resized.block_hub_paged) assert.equal(resized.block_hub_page, 2, 'resize keeps the focused final page visible');
        previousPaged = resized.block_hub_paged;
        if (sweepPlayer === null) {
          sweepPlayer = resized.player_grounding;
          sweepZoom = resized.camera_view_size;
        }
        for (let previous = resized.block_hub_page; resized.block_hub_paged && previous > 0; previous--) {
          await clickHeaderControl('block_page_previous');
          await page.waitForFunction(p => window.__tenderloinGodotA11ySnapshot?.block_hub_page === p, previous - 1);
        }
        const seen = [];
        for (let actionPage = 0; actionPage < (resized.block_hub_paged ? 3 : 1); actionPage++) {
          const frame = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot.ui_frame);
          await page.waitForFunction(f => window.__tenderloinGodotA11ySnapshot?.ui_frame > f + 2, frame);
          const s = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
          assert.equal(s.block_hub_actions.length, s.block_hub_paged ? 4 : 12);
          assert.ok(s.block_panel_control.y >= s.header_control.y + s.header_control.height);
          assert.ok(s.block_panel_control.y + s.block_panel_control.height <= s.controls_control.y, `hub stays above walking controls at ${width}`);
          assert.ok(s.block_panel_control.y - s.header_control.y - s.header_control.height >= 180, 'hub leaves a useful scene area');
          assert.ok(s.player_screen.x >= s.play_area.x && s.player_screen.x <= s.play_area.x + s.play_area.width && s.player_screen.y >= s.play_area.y && s.player_screen.y <= s.play_area.y + s.play_area.height, 'followed character stays above the menu');
          assert.equal(s.player_grounding.x, sweepPlayer.x);
          assert.equal(s.player_grounding.z, sweepPlayer.z);
          assert.equal(s.camera_view_size, sweepZoom, 'hub framing preserves close-view zoom');
          for (const a of [...s.block_hub_actions, s.block_close_control, ...(s.block_hub_paged ? [s.block_page_previous, s.block_page_next] : [])]) {
            assert.ok(a.visible && a.width >= 44 && a.height >= 44);
            assert.ok(a.x >= s.block_panel_control.x && a.y >= s.block_panel_control.y && a.x + a.width <= s.block_panel_control.x + s.block_panel_control.width + 1 && a.y + a.height <= s.block_panel_control.y + s.block_panel_control.height + 1, `tablet control stays enclosed at ${width}`);
          }
          for (const a of s.block_hub_actions) {
            assert.equal(a.text_fits, true, `full tablet title: ${a.text} at ${width}`);
            seen.push(a.id);
          }
          if (actionPage === 0 || width === 600) await page.screenshot({ path: `artifacts/godot-${width}-tablet-actions-${actionPage + 1}.png` });
          if (s.block_hub_paged && actionPage < 2) {
            await clickHeaderControl('block_page_next');
            await page.waitForFunction(p => window.__tenderloinGodotA11ySnapshot?.block_hub_page === p, actionPage + 1);
          }
        }
        assert.deepEqual(seen, Array.from({ length: 12 }, (_, i) => i));
      }
      assert.equal(await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1')), sweepSave, 'tablet paging and resize preserve progress');
      await clickHeaderControl('block_close_control');
      runs[runs.length - 1].intermediateHubWidthsVerified = [599, 600, 700, 800, 900, 1000, 1049, 1050, 1100];
    }
    if (size.width === 1100 || size.width === 320) {
      const touchHub = size.width === 320;
      const hubSizes = touchHub ? [{ width: 640, height: 360 }, { width: 844, height: 390 }] : [{ width: 600, height: 360 }, { width: 640, height: 360 }, { width: 667, height: 375 }, { width: 844, height: 390 }, { width: 800, height: 480 }, { width: 1100, height: 480 }];
      await page.keyboard.press('KeyF');
      const shortSave = await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1'));
      const shortInitial = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
      const encloses = (outer, inner) => inner.x >= outer.x - 1 && inner.y >= outer.y - 1 && inner.x + inner.width <= outer.x + outer.width + 1 && inner.y + inner.height <= outer.y + outer.height + 1;
      const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
      async function shortTap(control) {
        const snap = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
        const canvas = await page.locator('#canvas').boundingBox();
        const x = canvas.x + (control.x + control.width / 2) * canvas.width / snap.viewport_width;
        const y = canvas.y + (control.y + control.height / 2) * canvas.height / snap.viewport_height;
        if (touchHub) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
      }
      for (const shortSize of hubSizes) {
        await page.setViewportSize(shortSize);
        await page.waitForFunction(sz => window.__tenderloinGodotA11ySnapshot?.viewport_width === sz.width && window.__tenderloinGodotA11ySnapshot?.viewport_height === sz.height && !window.__tenderloinGodotA11ySnapshot.layout_refit_pending, shortSize);
        await page.keyboard.press('KeyG');
        await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.block_panel_control.visible && window.__tenderloinGodotA11ySnapshot?.block_hub_side);
        let snap = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
        while (snap.block_hub_page > 0) {
          await shortTap(snap.block_page_previous);
          await page.waitForFunction(p => window.__tenderloinGodotA11ySnapshot?.block_hub_page === p, snap.block_hub_page - 1);
          snap = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
        }
        const seen = [];
        for (let actionPage = 0; actionPage < 3; actionPage++) {
          const frame = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot.ui_frame);
          await page.waitForFunction(f => window.__tenderloinGodotA11ySnapshot?.ui_frame > f + 2, frame);
          snap = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
          const screen = { x: 0, y: 0, ...shortSize };
          assert.ok(snap.block_hub_side && snap.block_hub_paged && snap.block_hub_pages === 3);
          assert.ok(encloses(screen, snap.block_panel_control) && snap.block_panel_control.y >= snap.header_control.y + snap.header_control.height + 7, 'short hub fits below header and inside viewport');
          assert.ok(!overlaps(snap.block_panel_control, snap.controls_control), 'side hub leaves walking controls separate');
          assert.ok(snap.play_area.width >= 240 && snap.play_area.height >= 100 && snap.overlays.player.height > 20 && encloses(snap.play_area, snap.overlays.player), 'full enlarged character and YOU retain useful scene space');
          for (const caption of snap.overlays.captions) assert.ok(!overlaps(caption, snap.overlays.player), 'side-hub world captions leave player clear');
          if (snap.overlays.guide_label.visible) assert.ok(!overlaps({ x: snap.overlays.guide_label.x - 7, y: snap.overlays.guide_label.y - 7, width: snap.overlays.guide_label.width + 14, height: snap.overlays.guide_label.height + 14 }, snap.overlays.player), 'side-hub outlined objective leaves player clear');
          for (const action of [...snap.block_hub_actions, snap.block_page_previous, snap.block_page_next, snap.block_close_control]) {
            assert.ok(encloses(snap.block_panel_control, action) && action.width >= 44 && action.height >= 44, 'short hub targets enclosed and tappable');
          }
          for (const action of snap.block_hub_actions) { assert.ok(action.text_fits, `short full title ${action.text}`); seen.push(action.id); }
          for (const action of snap.walking_controls) assert.ok(action.text_fits && encloses(screen, action) && action.width >= 44 && action.height >= 44, `short walking target ${action.text}`);
          assert.equal(snap.camera_view_size, shortInitial.camera_view_size);
          assert.equal(snap.player_grounding.x, shortInitial.player_grounding.x);
          assert.equal(snap.player_grounding.z, shortInitial.player_grounding.z);
          if (actionPage === 0) {
            await page.screenshot({ path: `artifacts/codex-short-hub-${shortSize.width}x${shortSize.height}-${touchHub ? 'touch' : 'mouse'}.png` });
            await writeFile(`artifacts/codex-short-hub-${shortSize.width}x${shortSize.height}-${touchHub ? 'touch' : 'mouse'}.json`, JSON.stringify(snap, null, 2));
          }
          if (actionPage < 2) { await shortTap(snap.block_page_next); await page.waitForFunction(p => window.__tenderloinGodotA11ySnapshot?.block_hub_page === p, actionPage + 1); }
        }
        assert.deepEqual(seen, Array.from({ length: 12 }, (_, i) => i));
        // Read the actual full hub detail, then deliberately open/close Info.
        await shortTap(snap.block_page_previous);
        await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.block_hub_page === 1);
        const detail = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
        assert.ok(detail.block_detail_scroll_max > detail.block_detail_scroll_page, 'real short hub description overflows');
        const canvas = await page.locator('#canvas').boundingBox();
        const detailX = canvas.x + (detail.block_detail_control.x + detail.block_detail_control.width / 2) * canvas.width / shortSize.width;
        const detailY = canvas.y + (detail.block_detail_control.y + detail.block_detail_control.height / 2) * canvas.height / shortSize.height;
        if (touchHub) {
          const finger = await context.newCDPSession(page);
          await finger.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: detailX, y: detailY, id: 1 }] });
          await finger.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: detailX, y: detailY - 12, id: 1 }] });
          await finger.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await finger.detach();
        } else {
          await page.mouse.move(detailX, detailY);
          await page.mouse.wheel(0, 600);
        }
        await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.block_detail_scroll_value > 0);
        await shortTap(detail.info_control);
        await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.header_details_expanded);
        const infoFrame = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot.ui_frame);
        await page.waitForFunction(f => window.__tenderloinGodotA11ySnapshot?.ui_frame > f + 2, infoFrame);
        const withInfo = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
        assert.ok(encloses({ x: 0, y: 0, ...shortSize }, withInfo.block_panel_control), 'Info leaves hub Close reachable');
        assert.ok(withInfo.block_panel_control.y >= withInfo.header_control.y + withInfo.header_control.height + 7 && withInfo.info_reader.control.height >= 24, 'Info reader and dock clear each other');
        assert.ok(withInfo.info_reader.scroll_max > withInfo.info_reader.scroll_page, 'Info really has scrollable source text');
        const infoCanvas = await page.locator('#canvas').boundingBox();
        await page.mouse.move(infoCanvas.x + (withInfo.info_reader.control.x + withInfo.info_reader.control.width / 2) * infoCanvas.width / shortSize.width, infoCanvas.y + (withInfo.info_reader.control.y + withInfo.info_reader.control.height / 2) * infoCanvas.height / shortSize.height);
        await page.mouse.wheel(0, 1200);
        await page.waitForFunction(() => { const d = window.__tenderloinGodotA11ySnapshot.info_reader; return d.scroll_value > 0 && Math.abs(d.scroll_value - d.scroll_max + d.scroll_page) < 1; });
        await shortTap(withInfo.info_control);
        await page.waitForFunction(() => !window.__tenderloinGodotA11ySnapshot.header_details_expanded);
        const collapseFrame = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot.ui_frame);
        await page.waitForFunction(f => window.__tenderloinGodotA11ySnapshot?.ui_frame > f + 2, collapseFrame);
        await shortTap((await page.evaluate(() => window.__tenderloinGodotA11ySnapshot)).block_close_control);
        await page.waitForFunction(() => !window.__tenderloinGodotA11ySnapshot.block_panel_control.visible && !window.__tenderloinGodotA11ySnapshot.block_hub_side);
        const closed = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
        assert.equal(closed.walking_controls[1].text, 'Tenderloin Map', 'Close restores normal full-width labels');
        assert.equal(closed.controls_control.width, shortSize.width - 24);
        assert.equal(await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1')), shortSave, 'short hub reading/paging/Info/Close leave progress untouched');
        shortHubChecks.push({ ...shortSize, touch: touchHub, actions: seen.length });
      }
      // Rotate an already-open dock with focus on a later page.
      await page.setViewportSize({ width: 844, height: 390 });
      await page.keyboard.press('KeyG');
      await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot.block_hub_side);
      let rotating = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
      while (rotating.block_hub_page < 2) {
        await shortTap(rotating.block_page_next);
        await page.waitForFunction(p => window.__tenderloinGodotA11ySnapshot.block_hub_page === p, rotating.block_hub_page + 1);
        rotating = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
      }
      for (const boundary of [{ width: 844, height: 600 }, { width: 800, height: 559 }, { width: 800, height: 560 }, { width: 599, height: 667 }, { width: 640, height: 360 }]) {
        await page.setViewportSize(boundary);
        await page.waitForFunction(sz => window.__tenderloinGodotA11ySnapshot.viewport_width === sz.width && window.__tenderloinGodotA11ySnapshot.viewport_height === sz.height, boundary);
        const frame = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot.ui_frame);
        await page.waitForFunction(f => window.__tenderloinGodotA11ySnapshot.ui_frame > f + 2, frame);
        rotating = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
        assert.equal(rotating.block_hub_side, boundary.width >= 520 && boundary.height < 560);
        assert.equal(rotating.block_hub_page, 2, 'open rotation keeps the focused later page visible');
        assert.ok(rotating.block_hub_actions.some(a => a.id === 8), 'the focused first action on page3 remains visible');
      }
      await shortTap(rotating.walking_controls[1]);
      await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot.in_wide_overview && !window.__tenderloinGodotA11ySnapshot.block_panel_control.visible);
      const mapFrame = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot.ui_frame);
      await page.waitForFunction(f => window.__tenderloinGodotA11ySnapshot.ui_frame > f + 2, mapFrame);
      await shortTap((await page.evaluate(() => window.__tenderloinGodotA11ySnapshot)).walking_controls[2]);
      await page.waitForFunction(() => !window.__tenderloinGodotA11ySnapshot.in_wide_overview && window.__tenderloinGodotA11ySnapshot.camera_view_size === 45);
      // Start a real route, open the hub while moving, and stop with its compact target.
      await page.keyboard.press('KeyH');
      await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot.player_grounding.path_active);
      await page.keyboard.press('KeyG');
      await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot.block_hub_side && window.__tenderloinGodotA11ySnapshot.walk_control_text === 'Stop Walk');
      const shortMoving = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
      assert.ok(Math.hypot(shortMoving.player_grounding.x + 424.5, shortMoving.player_grounding.z - 62.5) > 200, 'Stop fixture keeps the Black Hawk destination over200m away before the gesture');
      await shortTap(shortMoving.walk_control);
      await page.waitForFunction(() => !window.__tenderloinGodotA11ySnapshot.player_grounding.path_active && window.__tenderloinGodotA11ySnapshot.announcement.startsWith('Walking stopped.'));
      const shortStopped = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
      await page.waitForFunction(f => window.__tenderloinGodotA11ySnapshot.ui_frame > f + 3, shortStopped.ui_frame);
      const shortStill = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
      assert.equal(shortStill.player_grounding.x, shortStopped.player_grounding.x);
      assert.equal(shortStill.player_grounding.z, shortStopped.player_grounding.z);
      assert.equal(await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1')), shortSave, 'Map/Find Me/Stop keep progress');
      await page.screenshot({ path: `artifacts/codex-short-hub-stopped-${touchHub ? 'touch' : 'mouse'}.png` });
      await verifyShortActivities(page, context, touchHub, shortActivityChecks);
      await verifyShortActivities(page, context, touchHub, narrowActivityChecks, true);
      await verifyPassiveActivities(page,context,touchHub);
      await verifyNarrowHub(page, context, touchHub);
      await verifyShortWalking(page, context, touchHub);
    }
    await context.close();
  }
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  await writeFile('artifacts/godot-browser.json', JSON.stringify({ runs, errors, external, limit: 'Pixel-change, isolated Godot localStorage save/reload, opt-in browser v1 save import, Web local WAV audition, DOM aria-live status bridge, wider 188-building Tenderloin exploration, M1 keepsake/loan returns, M3 programme/hosting, M4 civic listening hour & three-shot film short, M5 default-off neighborhood voices & isolated settings, M6 original SVG generation/export & measured local performance budgets, and driver-inspected screenshots, not full canvas button DOM/screen-reader or physical-phone acceptance.' }, null, 2));
  assert.ok(queuedActivityRewardChecks > 0, 'at least one actual crowded activity exercises queued reward timer and Close delivery');
  assert.ok(shortStartClicked && shortStartTouchClicked, 'real mouse and touch Start at640x360 were exercised');
  assert.equal(shortStoryReadChecks.length, 11, 'all required short startup reading cases executed');
  assert.equal(shortStoryReadChecks.filter(r => r.touch).length, 4, 'all four emulated short-phone reading cases use real touch input');
  assert.equal(shortHubChecks.length, 8, 'six mouse and two touch short hub cases exercised');
  assert.equal(shortActivityChecks.length, 18, 'twelve mouse and six finger short activity reading cases exercised');
  assert.equal(narrowActivityChecks.length, 39, 'twenty-seven mouse and twelve finger narrow-small activity cases exercised');
  assert.equal(narrowActivityChecks.filter(c=>c.width>=520&&c.width<560&&c.height<560).length,12,'all twelve new small landscape readers were exercised');
  assert.equal(passiveActivityChecks.length,12,'all twelve real passive walking arrivals were exercised');
  assert.equal(narrowHubChecks.length, 12, 'eight mouse and four finger narrow hub handoffs exercised');
  assert.equal(smallHubReaderChecks,4,'all four new mouse/finger small dock cases read overflowing full dialogue');
  assert.equal(shortWalkingChecks.length,10,'six mouse and four finger short walking cases exercised');
  assert.ok(shortWalkingCaptionChecks>0&&shortWalkingGuideChecks>0,'real short walking caption and guide checks are nonvacuous');
  console.log(JSON.stringify({ runs, queuedActivityRewardChecks, shortStoryReadChecks, shortHubChecks, shortActivityChecks, narrowActivityChecks, passiveActivityChecks, narrowHubChecks, smallHubReaderChecks, shortWalkingChecks, shortWalkingCaptionChecks, shortWalkingGuideChecks, shortStartClicked, shortStartTouchClicked, errors, external }));
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
