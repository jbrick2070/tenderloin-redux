import assert from 'node:assert/strict';

export async function verifyBeforeStreets(page,{touch,size,renderedPixels,mode='startup',outputDir='artifacts',privateFixture=false}) {
  const snap=()=>page.evaluate(()=>window.__tenderloinGodotA11ySnapshot);
  const storage=()=>page.evaluate(()=>Object.fromEntries(['tenderloin-redux.godot.save.v1','tenderloin-redux.godot.settings.v1','tenderloin-redux.save.v1'].map(k=>[k,localStorage.getItem(k)])));
  async function settle(){const f=(await snap()).ui_frame;await page.waitForFunction(f=>{const s=window.__tenderloinGodotA11ySnapshot;return s.ui_frame>f+4&&!s.layout_refit_pending&&!s.before_streets.layout_pending;},f);}
  async function tap(b){const s=await snap(),c=await page.locator('#canvas').boundingBox();assert.ok(b.visible&&!b.disabled&&b.width>=44&&b.height>=44);assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=s.viewport_width+1&&b.y+b.height<=s.viewport_height+1);const x=c.x+(b.x+b.width/2)*c.width/s.viewport_width,y=c.y+(b.y+b.height/2)*c.height/s.viewport_height;if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);await settle();}
  const initial=await snap(),stable=await storage(),quiet=[initial.music_playing,initial.music_volume,initial.reward_sounds_enabled];
  let rotatedReference=null;
  if(mode==='startup'){
    await page.setViewportSize({width:520,height:360});await settle();
    const ref=await snap();rotatedReference={view:ref.camera_view_size,pose:ref.camera_pose};
    await page.setViewportSize(size);await settle();
  }
  if(mode==='revisit'){
    if(initial.block_panel_control.visible){await page.keyboard.press('KeyG');await settle();}
    if(!(await snap()).header_details_expanded)await tap((await snap()).info_control);
    await tap((await snap()).before_streets.entry);
  }else await tap((await snap()).opening_control);
  let s=await snap();assert.ok(s.before_streets.visible);const pose=s.camera_pose,ground=[s.player_grounding.x,s.player_grounding.z];
  if(mode==='startup')assert.ok(s.startup_pending&&!s.story_detail.panel.visible,'opening hides but does not accept original startup');
  const o=()=>snap().then(s=>s.before_streets);
  let h=await o();while(h.view>0){await tap(h.buttons[0]);h=await o();}
  const first=await renderedPixels(page);await tap(h.buttons[1]);h=await o();
  assert.equal(h.view,1);assert.match(h.description,/shifted crest/);assert.match((await snap()).announcement,/shifted crest/);
  const second=await renderedPixels(page),c=await page.locator('#canvas').boundingBox();let changed=0;
  for(let y=h.picture.y+4;y<h.picture.y+h.picture.height-4;y+=4)for(let x=h.picture.x+4;x<h.picture.x+h.picture.width-4;x+=4){const px=c.x+x*c.width/size.width,py=c.y+y*c.height/size.height;if(first.pixel(px,py).some((v,k)=>Math.abs(v-second.pixel(px,py)[k])>30))changed++;}
  assert.ok(changed>=60,'real gust substantially changes visible dune illustration');
  await tap(h.buttons[1]);assert.equal((await o()).view,2);assert.ok((await o()).buttons[1].disabled);
  await tap((await o()).buttons[2]);const response=(await o()).text;const shapesArt=await renderedPixels(page);
  await tap((await o()).buttons[3]);h=await o();assert.equal(h.observation,1);assert.notEqual(h.text,response);assert.match(h.text,/^Bea \(fictional neighbor\)/);assert.match(h.text,/Ramaytush homeland today/);
  const timeArt=await renderedPixels(page);let responsePixels=0;
  for(let y=h.picture.y+4;y<h.picture.y+h.picture.height-4;y+=4)for(let x=h.picture.x+4;x<h.picture.x+h.picture.width-4;x+=4){const px=c.x+x*c.width/size.width,py=c.y+y*c.height/size.height;if(shapesArt.pixel(px,py).some((v,k)=>Math.abs(v-timeArt.pixel(px,py)[k])>30))responsePixels++;}
  assert.ok(responsePixels>=8,'chosen observation visibly changes original Bea card');
  await page.screenshot({path:`${outputDir}/opening-${size.width}-${mode}-response.png`});
  await tap(h.buttons[4]);await page.keyboard.press('End');await settle();h=await o();assert.ok(h.source_view&&h.scroll_max>0&&Math.abs(h.scroll-h.scroll_max)<1);assert.match(h.text,/ramaytushtribe.org/);
  await page.keyboard.press('Tab');await settle();assert.ok((await o()).buttons.some(b=>b.focused),'arrow test begins on an actual button, not reader');
  await page.keyboard.press('ArrowUp');await page.keyboard.down('KeyW');await page.waitForTimeout(150);await page.keyboard.up('KeyW');await page.keyboard.press('Shift+F8');await settle();
  assert.ok((await o()).visible&&!(await snap()).story_picker.visible);if(mode==='startup')assert.ok((await snap()).startup_pending);
  assert.deepEqual((await snap()).camera_pose,pose);assert.deepEqual([(await snap()).player_grounding.x,(await snap()).player_grounding.z],ground);assert.deepEqual(await storage(),stable);
  for(const viewport of [{width:320,height:568},{width:520,height:360},...(mode==='startup'?[]:[size])]){
    await page.setViewportSize(viewport);await settle();h=await o();
    for(const b of [h.top,h.tray,h.picture,...h.buttons])assert.ok(b.x>=-1&&b.y>=-1&&b.x+b.width<=viewport.width+1&&b.y+b.height<=viewport.height+1,'complete opening controls and illustration fit live rotation');
    assert.ok(h.buttons.every(b=>b.width>=44&&b.height>=44&&b.words_fit));assert.ok(h.picture.width>=180&&h.picture.height>=80&&h.reader.height>=64);
  }
  if(mode==='startup')await page.keyboard.down('KeyW');
  await page.keyboard.press('Escape');await settle();
  if(mode==='startup'){await page.keyboard.down('KeyW');await settle();await page.keyboard.up('KeyW');}
  s=await snap();assert.ok(!s.before_streets.visible);
  if(mode==='startup'){
    assert.ok(s.startup_pending&&s.story_detail.panel.visible&&s.story_start_focus);assert.ok(initial.story_detail.text.length>0);assert.equal(s.story_detail.text,initial.story_detail.text,'exact original chapter reader returns');
    assert.deepEqual([s.player_grounding.x,s.player_grounding.z],ground,'held movement through Skip never walks behind startup');
    assert.ok(Math.abs(s.camera_view_size-rotatedReference.view)<0.001,'new-aspect return matches ordinary overview zoom');
    for(const [k,v] of Object.entries(rotatedReference.pose))assert.ok(Math.abs(s.camera_pose[k]-v)<0.001,'new-aspect return matches ordinary overview pose');
    await page.setViewportSize(size);await settle();
  }
  else{
    if(s.header_details_expanded!==initial.header_details_expanded)await tap(s.info_control);
    if(initial.block_panel_control.visible){await page.keyboard.press('KeyG');await settle();}
  }
  assert.deepEqual(await storage(),stable);s=await snap();assert.deepEqual([s.music_playing,s.music_volume,s.reward_sounds_enabled],quiet);
  return {...size,touch,mode,privateFixture,changed,responsePixels,sourceReader:true,actualShiftF8:true,heldSkip:mode==='startup',rotatedReturn:mode==='startup',originalStartupPreserved:mode==='startup',noWrites:true};
}
