import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';

export async function verifyHelperBench(page,{touch,size,renderedPixels,outputDir='artifacts',privateFixture=false}) {
  const snap=()=>page.evaluate(()=>window.__tenderloinGodotA11ySnapshot);
  const storage=()=>page.evaluate(()=>Object.fromEntries(['tenderloin-redux.godot.save.v1','tenderloin-redux.godot.settings.v1','tenderloin-redux.save.v1'].map(k=>[k,localStorage.getItem(k)])));
  async function settle(){const f=(await snap()).ui_frame;await page.waitForFunction(f=>{const s=window.__tenderloinGodotA11ySnapshot;return s.ui_frame>f+4&&!s.layout_refit_pending&&!s.helper_bench.layout_pending&&!s.film_screening.layout_pending;},f);}
  async function tap(b){const s=await snap(),c=await page.locator('#canvas').boundingBox();assert.ok(b.visible&&!b.disabled&&b.width>=44&&b.height>=44);assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=s.viewport_width+1&&b.y+b.height<=s.viewport_height+1);const x=c.x+(b.x+b.width/2)*c.width/s.viewport_width,y=c.y+(b.y+b.height/2)*c.height/s.viewport_height;if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);await settle();}
  // Inspect the furniture with deliberate camera gestures, never a product camera takeover.
  const layout=JSON.parse((await storage())['tenderloin-redux.godot.save.v1']).gathering_layout;
  if((await snap()).block_panel_control.visible){await page.keyboard.press('KeyG');await settle();}
  await page.keyboard.press('KeyF');await settle();
  for(let n=0;n<5;n++){const s=await snap(),r=s.play_area,c=await page.locator('#canvas').boundingBox();await page.mouse.move(c.x+(r.x+r.width*.5)*c.width/s.viewport_width,c.y+(r.y+r.height*.5)*c.height/s.viewport_height);await page.mouse.wheel(0,-160);await settle();}
  async function centerDisplay(){for(let n=0;n<8;n++){
    const s=await snap(),li=layout==='table'?0:1,faces=s.helper_bench.world[li].frames,r=s.play_area,c=await page.locator('#canvas').boundingBox();
    const cx=faces.reduce((v,p)=>v+p.x,0)/3,cy=faces.reduce((v,p)=>v+p.y,0)/3;
    const dx=Math.max(-s.viewport_width*.3,Math.min(s.viewport_width*.3,r.x+r.width*.5-cx)),dy=Math.max(-s.viewport_height*.2,Math.min(s.viewport_height*.2,r.y+r.height*.5-cy));
    if(Math.hypot(dx*c.width/s.viewport_width,dy*c.height/s.viewport_height)<=10)break;
    const x=c.x+(r.x+r.width*.5)*c.width/s.viewport_width,y=c.y+(r.y+r.height*.5)*c.height/s.viewport_height;
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx*c.width/s.viewport_width,y+dy*c.height/s.viewport_height,{steps:8});await page.mouse.up();await settle();
  }}
  await centerDisplay();
  // Source/retained-image diagnosis: yaw0 puts the table edge over the low
  // paint frame. Inspect from local +Z using real manual orbit controls.
  // This is an inspection view, not a claim of readable ink at every angle.
  await page.keyboard.down('Shift');await page.keyboard.down('ArrowLeft');
  try{await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.camera_pose.yaw<=-.62,null,{timeout:4000});}finally{await page.keyboard.up('ArrowLeft');await page.keyboard.up('Shift');}
  await page.keyboard.down('Shift');await page.keyboard.down('ArrowUp');
  try{await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.camera_pose.pitch>=1.64,null,{timeout:4000});}finally{await page.keyboard.up('ArrowUp');await page.keyboard.up('Shift');}
  await settle();await centerDisplay();
  const initial=await snap(),stable=await storage();assert.ok(initial.helper_bench.available&&!initial.helper_bench.complete&&!initial.player_grounding.path_active);
  const copied=JSON.parse(stable['tenderloin-redux.godot.save.v1']).film.result;
  const quiet=[initial.music_playing,initial.music_volume,initial.reward_sounds_enabled];
  async function enter(){await page.keyboard.press('F4');await settle();const s=await snap();assert.ok(s.film_screening.visible);assert.match(s.film_screening.text,/invitation stays/);await tap(s.film_screening.buttons.find(b=>b.text==='Helper workshop'));assert.ok((await snap()).helper_bench.visible);}
  await enter();let s=await snap(),h=s.helper_bench;const pose=s.camera_pose,ground=[s.player_grounding.x,s.player_grounding.z];
  assert.ok(h.buttons[4].disabled&&h.focus_within);await tap(h.buttons[1]);
  const first=await renderedPixels(page);await tap((await snap()).helper_bench.buttons[3]);h=(await snap()).helper_bench;assert.deepEqual(h.fitted,[false,true]);
  await tap(h.buttons[5]);await enter();h=(await snap()).helper_bench;assert.deepEqual(h.fitted,[false,true]);assert.ok(h.focus_within);
  await tap(h.buttons[2]);h=(await snap()).helper_bench;assert.deepEqual(h.fitted,[true,true]);assert.ok(!h.buttons[4].disabled);
  await tap(h.buttons[4]);h=(await snap()).helper_bench;assert.ok(h.complete&&h.buttons[4].disabled);assert.match(h.text,/^Dez: Your upright display/);assert.match(h.text,/helper lifted the frames and parked/);
  const last=await renderedPixels(page),c=await page.locator('#canvas').boundingBox();let changed=0;
  for(let y=h.picture.y+4;y<h.picture.y+h.picture.height-4;y+=4)for(let x=h.picture.x+4;x<h.picture.x+h.picture.width-4;x+=4){const px=c.x+x*c.width/size.width,py=c.y+y*c.height/size.height;if(first.pixel(px,py).some((v,k)=>Math.abs(v-last.pixel(px,py)[k])>30))changed++;}
  assert.ok(changed>=50,'actual support fitting and helper instruction change rendered construction');
  await page.screenshot({path:`${outputDir}/helper-${size.width}-upright.png`});
  await tap(h.buttons[0]);h=(await snap()).helper_bench;assert.equal(h.selected,0);assert.ok(h.complete);await tap(h.buttons[0]);assert.equal((await snap()).helper_bench.selected,0);
  for(const world of h.world){assert.equal(world.frames.length,3);assert.deepEqual(world.frames.map(f=>f.shot),copied.order);assert.deepEqual(world.frames.map(f=>f.copied_key),copied.order.map(id=>`${copied.framing}:${id}`));assert.ok(world.frames.every(f=>f.texture&&f.height>0.45&&f.height<1.13));}
  for(const viewport of [{width:320,height:568},{width:520,height:360},size]){
    await page.setViewportSize(viewport);await settle();h=(await snap()).helper_bench;
    for(const b of [h.top,h.tray,h.picture,...h.buttons])assert.ok(b.x>=-1&&b.y>=-1&&b.x+b.width<=viewport.width+1&&b.y+b.height<=viewport.height+1,'helper controls/art fit live resize');
    assert.ok(h.buttons.every(b=>b.width>=44&&b.height>=44&&b.text_fits));assert.ok(h.picture.width>=180&&h.picture.height>=80&&h.reader.height>=64);
  }
  await page.keyboard.press('End');await settle();h=(await snap()).helper_bench;assert.ok(h.scroll_max>0&&Math.abs(h.scroll-h.scroll_max)<1);
  await page.keyboard.press('Shift+F8');await page.keyboard.press('F4');await page.keyboard.down('KeyW');await page.waitForTimeout(100);await page.keyboard.up('KeyW');await settle();
  s=await snap();assert.ok(s.helper_bench.visible&&!s.story_picker.visible);assert.deepEqual(s.camera_pose,pose);assert.deepEqual([s.player_grounding.x,s.player_grounding.z],ground);
  await page.keyboard.down('KeyW');await tap(s.helper_bench.buttons[5]);await settle();s=await snap();assert.deepEqual([s.player_grounding.x,s.player_grounding.z],ground,'held movement through Keep waits for release');assert.ok(s.helper_bench.release_pending);await page.keyboard.up('KeyW');await settle();s=await snap();assert.ok(!s.helper_bench.release_pending,'real release clears the guard');
  assert.ok(!s.helper_bench.visible);assert.equal(s.helper_bench.world.filter(w=>w.visible).length,1);assert.deepEqual(await storage(),stable);assert.deepEqual([s.music_playing,s.music_volume,s.reward_sounds_enabled],quiet);
  const pix=await renderedPixels(page),world=s.helper_bench.world.find(w=>w.visible),canvas=await page.locator('#canvas').boundingBox(),worldInk=[];
  function guideClear(state){
    const guide=state.overlays.guide_label,points=state.helper_bench.world.find(w=>w.visible).frames.flatMap(f=>f.corners),art={left:Math.min(...points.map(p=>p.x))-4,right:Math.max(...points.map(p=>p.x))+4,top:Math.min(...points.map(p=>p.y))-4,bottom:Math.max(...points.map(p=>p.y))+4};
    assert.ok(guide.visible,'nearby inspected art retains a visible objective label');
    assert.ok(guide.x+guide.width+7<=art.left||guide.x-7>=art.right||guide.y+guide.height+7<=art.top||guide.y-7>=art.bottom,'outlined objective label clears all actual copied frames');
    return {form:state.helper_bench.selected,guide,art};
  }
  const guideClearance=[guideClear(s)];
  for(const face of world.frames){let paper=0,ink=0,borderInk=0,pinkMotif=0;const q=face.corners,colors=[];
    const sample=(u,v)=>{const x=(q[0].x*(1-u)+q[1].x*u)*(1-v)+(q[2].x*(1-u)+q[3].x*u)*v,y=(q[0].y*(1-u)+q[1].y*u)*(1-v)+(q[2].y*(1-u)+q[3].y*u)*v;assert.ok(x>=0&&y>=0&&x<size.width&&y<size.height,'actual triptych inside framed viewport');return pix.pixel(canvas.x+x*canvas.width/s.viewport_width,canvas.y+y*canvas.height/s.viewport_height);};
    for(let u=.08;u<.92;u+=.04)for(let v=.14;v<.86;v+=.04){const rgb=sample(u,v);colors.push(rgb.join(','));if(rgb.every(v=>v>180))paper++;if(rgb[0]<120&&rgb[1]<170)ink++;}
    // Source: original world texture letterboxes 420x236 at y17.625 in 271.25.
    // The old inner window excludes the wide dark border; paint has a 3px green
    // outline, but its actual broad motif is pink. Require BOTH dark frame and
    // spatially correct pink artwork, never count a blank border as a painting.
    for(let u=.08;u<.92;u+=.04)for(const v of [.045,.955]){const rgb=sample(u,v);if(rgb[0]<120&&rgb[1]<170)borderInk++;}
    const scale=copied.framing==='close'?1.2:1,tx=scale===1.2?-30:0,ty=scale===1.2?-8:0;
    const drawing=(x,y)=>sample((x*scale+tx)/420,(y*scale+ty+17.625)/271.25);
    const blank=drawing(305,65);
    if(face.shot==='paint')for(const dx of [-10,-5,0,5,10])for(const dy of [-10,-5,0,5,10]){const rgb=drawing(124+dx,87+dy);if(rgb[0]-rgb[1]-(blank[0]-blank[1])>=15&&blank[1]-rgb[1]>=15)pinkMotif++;}
    worldInk.push({shot:face.shot,copiedKey:face.copied_key,paper,ink,borderInk,pinkMotif,blank,cutawayAdditions:s.cutaway_additions,fingerprint:colors.join('|')});
    await writeFile(`${outputDir}/helper-${size.width}-world-samples.json`,JSON.stringify(worldInk,null,2));
    assert.ok(paper>40&&borderInk>3&&(face.shot==='paint'?pinkMotif>3:ink>3),`actual copied world artwork: ${JSON.stringify(worldInk.map(({fingerprint,...x})=>x))}`);
  }
  assert.equal(new Set(worldInk.map(x=>x.fingerprint)).size,3,'three actual world drawings remain visually distinct');
  await page.screenshot({path:`${outputDir}/helper-${size.width}-world.png`});
  await enter();await tap((await snap()).helper_bench.buttons[1]);await tap((await snap()).helper_bench.buttons[5]);await settle();
  guideClearance.push(guideClear(await snap()));await page.screenshot({path:`${outputDir}/helper-${size.width}-upright-world.png`});
  await enter();await tap((await snap()).helper_bench.buttons[0]);await tap((await snap()).helper_bench.buttons[5]);
  await enter();assert.ok((await snap()).helper_bench.complete);await tap((await snap()).helper_bench.buttons[5]);
  await page.keyboard.down('KeyW');await page.waitForTimeout(120);await page.keyboard.up('KeyW');await settle();s=await snap();assert.ok(Math.hypot(s.player_grounding.x-ground[0],s.player_grounding.z-ground[1])>.01,'new movement works after the held-exit key was released');
  // Genuine save/reload boundary, not a synthetic completion fixture.
  await page.reload();await page.locator('#status').waitFor({state:'hidden',timeout:60000});await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.startup_pending);
  await page.keyboard.press('Escape');await settle();s=await snap();assert.ok(s.helper_bench.available&&!s.helper_bench.complete);assert.deepEqual(s.helper_bench.fitted,[false,false]);
  const loaded=await storage();assert.deepEqual(JSON.parse(loaded['tenderloin-redux.godot.save.v1']),JSON.parse(stable['tenderloin-redux.godot.save.v1']));assert.equal(loaded['tenderloin-redux.save.v1'],stable['tenderloin-redux.save.v1']);
  await enter();assert.ok(!(await snap()).helper_bench.complete);await tap((await snap()).helper_bench.buttons[5]);
  if((await snap()).music_playing!==quiet[0])await tap((await snap()).music_toggle_control);
  s=await snap();assert.deepEqual([s.music_playing,s.music_volume,s.reward_sounds_enabled],quiet,'test context restores original quiet/play intent after explicit reload');
  return {...size,touch,privateFixture,changed,worldInk,guideClearance,inspectionPose:pose,copiedOrder:copied.order,retainedInvitation:true,actualReload:true,noWrites:true,quiet:true};
}
