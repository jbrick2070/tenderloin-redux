import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';

export async function verifyHostedAfternoon(page,{touch=false,size,revealPhoneControl,renderedPixels,findHubAction,privateFixture=false,outputDir='artifacts'}){
  await mkdir(outputDir,{recursive:true});
  const snap=()=>page.evaluate(()=>window.__tenderloinGodotA11ySnapshot);
  const storage=()=>page.evaluate(()=>Object.fromEntries(['tenderloin-redux.godot.save.v1','tenderloin-redux.save.v1','tenderloin-redux.godot.settings.v1'].map(k=>[k,localStorage.getItem(k)])));
  async function settle(){const f=(await snap()).ui_frame;await page.waitForFunction(f=>{const s=window.__tenderloinGodotA11ySnapshot;return s.ui_frame>f+4&&!s.layout_refit_pending&&!s.compact_panel_layout_pending&&!s.programme_studio.layout_pending;},f);}
  async function tap(b,reader=false){
    if(revealPhoneControl)b=await revealPhoneControl(page,b,tap);
    assert.ok(b?.visible&&!b.disabled&&b.width>=44&&b.height>=(reader?1:44),'actual enabled Hosted target');
    const s=await snap(),c=await page.locator('#canvas').boundingBox();
    assert.ok(b.x>=-1&&b.y>=-1&&b.x+b.width<=s.viewport_width+1&&b.y+b.height<=s.viewport_height+1,'Hosted target is on screen');
    const x=c.x+(b.x+b.width/2)*c.width/s.viewport_width,y=c.y+(b.y+b.height/2)*c.height/s.viewport_height;
    if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);
    await settle();
  }
  async function open(){
    if(!(await snap()).block_panel_control.visible){await page.keyboard.press('KeyG');await settle();}
    const b=await findHubAction(page,tap,/Hosted All/);assert.equal(b.id,3);
    await tap(b);assert.ok((await snap()).programme_studio.hosted_view,'same completed hub now opens actual Hosted review');
  }
  await page.setViewportSize(size);await settle();
  if((await snap()).story_detail.panel.visible){await page.keyboard.press('Escape');await settle();}
  const inputCameraIntent={following:(await snap()).following_player,pose:(await snap()).camera_pose};
  // Establish actual manual ownership before asserting an exact camera pose.
  // A following camera may continue interpolating while a reader is closed.
  if((await snap()).block_panel_control.visible){await page.keyboard.press('KeyG');await settle();}
  {const s=await snap(),r=s.play_area,c=await page.locator('#canvas').boundingBox(),x=c.x+(r.x+r.width*.35)*c.width/s.viewport_width,y=c.y+(r.y+r.height*.55)*c.height/s.viewport_height,dx=Math.min(80,r.width*.3)*c.width/s.viewport_width;
    if(touch){const cd=await page.context().newCDPSession(page);await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});for(let i=1;i<=5;i++)await cd.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/5,y,id:1}]});await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cd.detach();}
    else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y,{steps:5});await page.mouse.up();}await settle();assert.equal((await snap()).following_player,false,'actual scene drag establishes manual view');assert.equal((await snap()).player_grounding.path_active,false,'manual drag does not walk');}
  const initialStorage=await storage(),saved=JSON.parse(initialStorage['tenderloin-redux.godot.save.v1']);
  assert.equal(saved.hosting.results.length,4);const phase=saved.civic.phase;
  const photo=JSON.stringify(saved.epilogue.photo),order=saved.hosting.order,owners=['Bea','Dez','Celeste','Thanh'],ids=['stories','beats','art','pause'];
  await open();const initial=await snap(),quiet=[initial.music_playing,initial.music_volume,initial.music_mode,initial.reward_sounds_enabled],pose=initial.camera_pose;
  let storyInk,changed=0;
  for(let i=0;i<4;i++){
    await tap((await snap()).programme_studio.buttons[i]);const h=(await snap()).programme_studio;
    assert.ok(h.text.startsWith(owners[i]+': "'),'specific resident response leads each selected card before order/disclosure');assert.ok(h.buttons[i].text.startsWith(`${order.indexOf(ids[i])+1}.`));
    assert.deepEqual(h.hosted_order,order);assert.ok(h.buttons.slice(4,7).every(b=>b.disabled));
    assert.ok(h.buttons.every(b=>b.words_fit),'full action and contribution words fit without orphan letters');
    assert.ok(h.picture.width>=180&&h.picture.height>=60&&h.reader.height>=40,'useful copied picture and full reader');
    for(const b of [h.top,h.tray,h.picture,...h.buttons])assert.ok(b.x>=-1&&b.y>=-1&&b.x+b.width<=size.width+1&&b.y+b.height<=size.height+1,'full Hosted controls and art fit');
    if(i===0)storyInk=await renderedPixels(page);
    if(i===2){const ink=await renderedPixels(page),c=await page.locator('#canvas').boundingBox();for(let y=h.picture.y+4;y<h.picture.y+h.picture.height-4;y+=4)for(let x=h.picture.x+4;x<h.picture.x+h.picture.width-4;x+=4){const px=c.x+x*c.width/size.width,py=c.y+y*c.height/size.height;if(storyInk.pixel(px,py).some((v,k)=>Math.abs(v-ink.pixel(px,py)[k])>30))changed++;}assert.ok(changed>=20,'actual copied story and six-shape panel render distinct original pixels');await page.screenshot({path:`${outputDir}/hosted-${size.width}-${phase}-art.png`});}
    assert.deepEqual(await storage(),initialStorage,'reading/selecting never writes progress, legacy save or settings');
  }
  let h=(await snap()).programme_studio;
  await tap(h.reader,true);await page.keyboard.press('End');await settle();h=(await snap()).programme_studio;
  assert.ok(h.scroll_max>0&&Math.abs(h.scroll-h.scroll_max)<=1,'actual End reaches complete invitation and disclosure');
  await tap(h.buttons[10]);assert.ok(!(await snap()).programme_studio.visible);assert.match((await snap()).announcement,phase==='done'?/completed gathering and Listening Hour remain available/:/Bea's offer stays with your completed gathering/,'Keep acknowledgment describes retained Hosted access');await open();
  h=(await snap()).programme_studio;
  if(phase!=='done'){
    assert.equal(h.buttons[7].text,'Follow this invitation');assert.equal(h.buttons[10].text,'Keep exploring');
    await tap(h.buttons[7]);let s=await snap();assert.ok(!s.programme_studio.visible&&!s.civic_listening.visible&&s.programme_studio.listening_entry_focused&&!s.story_detail.panel.visible,'Follow focuses existing F5 reader entry without pressing or chapter takeover');
    assert.deepEqual(await storage(),initialStorage,'Follow leaves exact civic/film/save/settings untouched');
    assert.deepEqual([s.music_playing,s.music_volume,s.music_mode,s.reward_sounds_enabled],quiet);assert.deepEqual(s.camera_pose,pose,'Follow preserves deliberate view');
    await page.screenshot({path:`${outputDir}/hosted-${size.width}-${phase}-follow.png`});
    await page.keyboard.press('F5');await settle();assert.ok((await snap()).civic_listening.visible);assert.deepEqual(await storage(),initialStorage,'separate explicit reader open does not advance Listening');await page.keyboard.press('Escape');await settle();
  }else{assert.ok(h.buttons[7].disabled);assert.match(h.text,/Dez's offer/);await tap(h.buttons[10]);}
  await page.keyboard.press('F6');await settle();h=(await snap()).programme_studio;
  assert.ok(!h.hosted_view&&!h.posted_view);assert.match(h.text,/does not start a second gathering/,'future planning boundary is explicit');
  await page.keyboard.press('Escape');await settle();
  assert.deepEqual(await storage(),initialStorage);assert.equal(JSON.stringify(JSON.parse((await storage())['tenderloin-redux.godot.save.v1']).epilogue.photo),photo);
  // This deliberate player pan is part of the journey. Subsequent civic tests
  // explicitly preserve this manual pose; it is not an implicit following baseline.
  assert.equal((await snap()).following_player,false);
  return {...size,touch,privateFixture,phase,order,changed,copiedResults:saved.hosting.results,focusOnly:phase!=='done',inputCameraIntent,manualInspectionRetained:true};
}
