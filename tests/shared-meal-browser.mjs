import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Actual canvas input. A retained full-run profile supplies progression in the
// complete gate; diagnostic callers must identify their private profile honestly.
export async function verifySharedMeal(page,{touch,size,revealPhoneControl,renderedPixels,privateFixture=false,outputDir='artifacts'}){
  await mkdir(outputDir,{recursive:true});
  const tag=`meal-${size.width}x${size.height}-${touch?'finger':'mouse'}`;
  const snap=()=>page.evaluate(()=>window.__tenderloinGodotA11ySnapshot);
  const storage=()=>page.evaluate(()=>Object.fromEntries(['tenderloin-redux.godot.save.v1','tenderloin-redux.save.v1','tenderloin-redux.godot.settings.v1'].map(k=>[k,localStorage.getItem(k)])));
  const cssBox=(p,s,c)=>({x:c.x+p.x*c.width/s.viewport_width,y:c.y+p.y*c.height/s.viewport_height,width:p.width*c.width/s.viewport_width,height:p.height*c.height/s.viewport_height});
  async function settle(){const f=(await snap()).ui_frame;await page.waitForFunction(f=>{const s=window.__tenderloinGodotA11ySnapshot;return s.ui_frame>f+3&&!s.layout_refit_pending&&!s.compact_panel_layout_pending&&!s.shared_meal.layout_pending;},f);}
  async function tap(b){
    if(revealPhoneControl)b=await revealPhoneControl(page,b,tap);
    const s=await snap(),c=await page.locator('#canvas').boundingBox();
    assert.ok(b?.visible&&!b.disabled&&b.width>=44&&b.height>=44,'actual enabled meal target');
    assert.ok(b.x>=-1&&b.y>=-1&&b.x+b.width<=s.viewport_width+1&&b.y+b.height<=s.viewport_height+1,'meal target is inside the actual game viewport');
    const x=c.x+(b.x+b.width/2)*c.width/s.viewport_width,y=c.y+(b.y+b.height/2)*c.height/s.viewport_height;
    if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);
    await settle();
  }
  async function open(){
    if(!(await snap()).block_panel_control.visible){await page.keyboard.press('KeyG');await settle();}
    for(let n=0;n<4;n++){
      const s=await snap(),b=s.block_hub_actions.find(b=>b.visible&&b.id===12);
      if(b){await tap(b);assert.ok((await snap()).shared_meal.visible,'actual Cook & Share opens');return;}
      assert.ok(!s.block_page_next.disabled,'new action remains reachable after original twelve');await tap(s.block_page_next);
    }
    assert.fail('Cook & Share missing');
  }
  function readable(m){
    assert.equal(m.font_size,16);assert.ok(m.reader.height>=(size.height<500?80:96));assert.ok(m.picture.height>=90);
    for(const b of m.buttons.filter(b=>b.visible))assert.ok(b.height>=44&&b.width>=44&&b.text_fits,'whole named control fits its actual font');
    assert.ok(m.focus_within,'meal owns keyboard focus');
  }
  await page.setViewportSize(size);await settle();
  let s=await snap();assert.ok(s.block_opened&&s.shared_meal.available,'earned gathering exists');
  const layout=JSON.parse((await storage())['tenderloin-redux.godot.save.v1']).gathering_layout;
  if(s.story_detail.panel.visible){await page.keyboard.press('Escape');await settle();}
  // Frame the actual serving surface through scene gestures before the modal.
  if((await snap()).block_panel_control.visible){await tap((await snap()).block_close_control);}
  await page.keyboard.press('KeyF');await settle();
  for(let n=0;n<5;n++){
    s=await snap();const r=s.play_area,c=await page.locator('#canvas').boundingBox();
    await page.mouse.move(c.x+(r.x+r.width*.5)*c.width/s.viewport_width,c.y+(r.y+r.height*.5)*c.height/s.viewport_height);
    await page.mouse.wheel(0,-160);await settle();
  }
  for(let n=0;n<8;n++){
    s=await snap();const li=layout==='table'?0:1,foods=s.shared_meal.world[li],r=s.play_area,c=await page.locator('#canvas').boundingBox();
    const cx=foods.reduce((v,p)=>v+p.x,0)/4,cy=foods.reduce((v,p)=>v+p.y,0)/4;
    const dx=Math.max(-s.viewport_width*.3,Math.min(s.viewport_width*.3,r.x+r.width*.5-cx)),dy=Math.max(-s.viewport_height*.2,Math.min(s.viewport_height*.2,r.y+r.height*.5-cy));
    // Scene drags begin after eight CSS pixels. Smaller corrections would be
    // interpreted as intentional walking taps, so stop framing within ten.
    if(Math.hypot(dx*c.width/s.viewport_width,dy*c.height/s.viewport_height)<=10)break;
    const x=c.x+(r.x+r.width*.5)*c.width/s.viewport_width,y=c.y+(r.y+r.height*.5)*c.height/s.viewport_height;
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx*c.width/s.viewport_width,y+dy*c.height/s.viewport_height,{steps:8});await page.mouse.up();await settle();
  }
  assert.equal((await snap()).player_grounding.path_active,false,'camera framing does not request a walking route');
  const beforeWorld=await renderedPixels(page,`${outputDir}/${tag}-before.png`);
  const before=await storage();s=await snap();const pose=s.camera_pose,point=s.player_grounding;
  const quiet=[s.music_playing,s.music_volume,s.music_mode,s.reward_sounds_enabled,s.reward_sound_count];
  await open();let m=(await snap()).shared_meal;assert.equal(m.revealed,1);assert.equal(m.selected,0);
  assert.ok(!/lo bak go|pad kra pao|red rice/i.test(m.text),'unearned future dish names stay unrevealed');
  const artHashes=[];
  for(let cook=0;cook<4;cook++){
    m=(await snap()).shared_meal;assert.equal(m.selected,cook);readable(m);
    // The full provenance is available in a real scrollable reader.
    const c=await page.locator('#canvas').boundingBox(),readerBox=cssBox(m.reader,await snap(),c);
    await page.mouse.move(readerBox.x+readerBox.width*.5,readerBox.y+readerBox.height*.5);
    await page.mouse.wheel(0,2000);await settle();assert.ok((await snap()).shared_meal.scroll_value>0,'full source/ingredients reader really scrolls');
    await tap((await snap()).shared_meal.buttons[3+cook%2]);await tap((await snap()).shared_meal.buttons[5+cook%2]);
    for(let step=0;step<5;step++){
      m=(await snap()).shared_meal;readable(m);assert.equal(m.steps[cook],step);
      await tap(m.buttons[2]);assert.equal((await snap()).shared_meal.steps[cook],step+1);
    }
    m=(await snap()).shared_meal;assert.equal(m.shared[cook],undefined);
    const picture=await page.screenshot({clip:cssBox(m.picture,await snap(),await page.locator('#canvas').boundingBox()),scale:'css'});
    artHashes.push(createHash('sha256').update(picture).digest('hex'));
    await page.screenshot({path:`${outputDir}/${tag}-dish${cook+1}.png`});
    await tap(m.buttons[7]);m=(await snap()).shared_meal;
    assert.equal(m.shared[cook].serving,cook%2);assert.equal(m.shared[cook].placement,cook%2);assert.equal(m.revealed,Math.min(4,cook+2));assert.equal(m.buttons[7].text,'Follow this invitation');
    const dish=m.world[layout==='table'?0:1][cook];
    if(layout==='table')assert.ok(cook%2?dish.local_z>0.1:dish.local_z< -0.1,'actual copied table food reaches the chosen edge');
    else assert.ok(cook%2?dish.local_x-(-2.7+(cook%2)*1.4)>0.19:Math.abs(dish.local_x-(-2.7+(cook%2)*1.4))<0.001,'actual copied cloth food reflects placement');
    assert.match(m.text,/invitation|come back/i);assert.deepEqual(await storage(),before,'preparation and serving leave all save/settings/legacy bytes intact');
    if(cook===0){
      await tap(m.buttons[8]);assert.ok(!(await snap()).shared_meal.visible);await open();m=(await snap()).shared_meal;
      assert.equal(m.selected,0);assert.equal(m.invitation,1);assert.equal(m.buttons[7].text,'Follow this invitation');
    }
    if(cook<3)await tap(m.buttons[7]);
  }
  assert.equal(new Set(artHashes).size,4,'four actual rendered finished food images differ');
  m=(await snap()).shared_meal;await tap(m.buttons[7]);m=(await snap()).shared_meal;assert.equal(m.selected,0);
  const copied=structuredClone(m.shared[0]);await tap(m.buttons[2]);await tap((await snap()).shared_meal.buttons[4]);
  assert.deepEqual((await snap()).shared_meal.shared[0],copied,'new preparation leaves copied world result');
  await page.keyboard.down('KeyW');await page.waitForTimeout(150);await page.keyboard.up('KeyW');await settle();
  assert.deepEqual((await snap()).player_grounding,point,'modal blocks walking');
  await page.keyboard.press('Escape');await settle();s=await snap();assert.ok(!s.shared_meal.visible);
  if(s.block_panel_control.visible)await tap(s.block_close_control);
  s=await snap();assert.deepEqual(s.camera_pose,pose,'whole meal keeps manually framed camera');
  assert.deepEqual([s.music_playing,s.music_volume,s.music_mode,s.reward_sounds_enabled,s.reward_sound_count],quiet,'meal preserves music/sounds/volume and adds no cue');
  const afterWorld=await renderedPixels(page,`${outputDir}/${tag}-world.png`),li=layout==='table'?0:1;
  const canvas=await page.locator('#canvas').boundingBox();
  const worldPixels=s.shared_meal.world[li].map(food=>{
    assert.ok(food.visible);let count=0;const center=cssBox({...food,width:0,height:0},s,canvas);
    for(let y=Math.max(0,Math.floor(center.y-9));y<Math.min(size.height,Math.ceil(center.y+9));y++)for(let x=Math.max(0,Math.floor(center.x-12));x<Math.min(size.width,Math.ceil(center.x+12));x++){
      const a=beforeWorld.pixel(x,y),b=afterWorld.pixel(x,y);
      if(Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])+Math.abs(a[2]-b[2])>30)count++;
    }
    assert.ok(count>=4,`${food.id} changes actual world pixels (${count})`);return {id:food.id,count,x:center.x,y:center.y};
  });
  // A second, controlled oracle changes each copied dish's actual serving
  // texture at the SAME position/camera with all world owners already visible.
  // Compare that exact quad against a no-input motion baseline at that quad.
  function differences(a,b,rect){let count=0;for(let y=Math.max(0,Math.floor(rect.y));y<Math.min(size.height,Math.ceil(rect.y+rect.height));y++)for(let x=Math.max(0,Math.floor(rect.x));x<Math.min(size.width,Math.ceil(rect.x+rect.width));x++){
    const p=a.pixel(x,y),q=b.pixel(x,y);if(p.reduce((n,v,k)=>n+Math.abs(v-q[k]),0)>30)count++;
  }return count;}
  for(let cook=0;cook<4;cook++){
    s=await snap();const food=s.shared_meal.world[li][cook],rect=cssBox(food.bounds,s,await page.locator('#canvas').boundingBox());
    const a=await renderedPixels(page);await page.waitForTimeout(180);const b=await renderedPixels(page),motion=differences(a,b,rect);
    await open();m=(await snap()).shared_meal;
    for(let n=0;m.selected!==cook&&n<4;n++){await tap(m.buttons[1]);m=(await snap()).shared_meal;}
    assert.equal(m.selected,cook);
    if(m.steps[cook]===5)await tap(m.buttons[2]);
    await tap((await snap()).shared_meal.buttons[3+(1-cook%2)]);
    for(let step=0;step<5;step++)await tap((await snap()).shared_meal.buttons[2]);
    await tap((await snap()).shared_meal.buttons[7]);m=(await snap()).shared_meal;
    assert.equal(m.shared[cook].serving,1-cook%2);assert.equal(m.revealed,4);
    await tap(m.buttons[8]);if((await snap()).block_panel_control.visible)await tap((await snap()).block_close_control);
    s=await snap();assert.deepEqual(s.camera_pose,pose);assert.deepEqual(s.shared_meal.world[li][cook].bounds,food.bounds,'copy changes the texture at the same actual world position');
    const afterCopy=await renderedPixels(page,`${outputDir}/${tag}-copy${cook+1}.png`),copyDifference=differences(b,afterCopy,rect);
    assert.ok(copyDifference>=4&&copyDifference>=motion+2,`${food.id} actual serving pixels change above the same-quad motion baseline (${copyDifference}/${motion})`);
    Object.assign(worldPixels[cook],{copyDifference,motion,cssBounds:rect});
  }
  assert.deepEqual(await storage(),before);await page.reload();await page.locator('#status').waitFor({state:'hidden',timeout:60000});
  await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.startup_pending);await page.keyboard.press('Escape');await settle();
  m=(await snap()).shared_meal;assert.equal(m.revealed,1);assert.equal(Object.keys(m.shared).length,0);assert.deepEqual(await storage(),before,'reload clears transient meal without rewriting progress');
  const result={size,touch,privateFixture,layout,artHashes,worldPixels,steps:20,saveBytes:Buffer.byteLength(before['tenderloin-redux.godot.save.v1']),limit:'Desktop browser/emulated phone; no physical, cultural or listening acceptance.'};
  await writeFile(`${outputDir}/${tag}-result.json`,JSON.stringify(result,null,2));return result;
}
