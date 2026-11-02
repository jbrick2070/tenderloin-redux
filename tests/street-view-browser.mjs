import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
// Street view (docs/FIRST_PERSON_PLAN.md, Phase 1) in the real web build: every session starts in the
// map view; Shift+F gives a perspective eye with sky above and street below; the button and Shift+F
// hand back the orthographic walking view. Phase 2: a mouse or touch drag turns the eye and its release
// never routes; the walk stick is a touchscreen control. Runs right after Start Exploring at each supported size.
export async function verifyStreetView(page,{touch,size,renderedPixels,outputDir='artifacts'}) {
  const snap=()=>page.evaluate(()=>window.__tenderloinGodotA11ySnapshot);
  const settle=async()=>{const f=(await snap()).ui_frame;await page.waitForFunction(f=>window.__tenderloinGodotA11ySnapshot.ui_frame>f+3,f);};
  const canvas=await page.locator('#canvas').boundingBox();
  const before=await snap();
  // Snapshot rectangles are in the game's viewport pixels; map them onto the canvas box like the other suites.
  const sx=canvas.width/before.viewport_width,sy=canvas.height/before.viewport_height;
  const tap=async b=>{assert.ok(b?.visible&&b.width>=44&&b.height>=44&&b.x>=0&&b.y>=0&&b.x+b.width<=size.width+1&&b.y+b.height<=size.height+1,`street button ${JSON.stringify(b)} is a visible 44px target inside the viewport`);const x=canvas.x+(b.x+b.width/2)*sx,y=canvas.y+(b.y+b.height/2)*sy;if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);};
  assert.equal(before.street_view.active,false,'every session starts in the map view');
  assert.equal(before.street_view.projection,1,'the map view is orthographic');
  assert.ok(before.following_player,'the walking view follows the player before the street check');
  assert.equal(before.street_view.button.text,'Street view');
  await page.keyboard.press('Shift+F');
  await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.street_view.active);
  await settle();
  let s=await snap();
  assert.equal(s.street_view.projection,0,'street view is a perspective camera');
  assert.ok(s.street_view.eye.y>1.5&&s.street_view.eye.y<1.75,`the eye is 1.6 m up (${s.street_view.eye.y})`);
  assert.ok(s.following_player&&!s.in_overview&&!s.in_wide_overview,'street view keeps following the player');
  assert.equal(s.street_view.button.text,'Map view','the button now offers the map view');
  assert.match(s.announcement,/Street view/,'entering street view is announced');
  // Sky above, street below: median samples across the middle of the upper and lower scene bands.
  const pixels=await renderedPixels(page,`${outputDir}/street-view-${size.width}x${size.height}-${touch?'touch':'mouse'}.png`);
  // Facades and the marker share the upper band with the sky, so count sky-coloured samples (blue over red)
  // across the band instead of trusting one point; the lower band is street and sidewalk.
  const isSky=([r,g,b])=>b>r+40&&b>=g&&b>120; // the teal road is bluish too; real sky is far bluer and lighter
  const band=y=>{const cols=[];for(let f=0.2;f<=0.8;f+=0.02)cols.push(pixels.pixel(canvas.x+size.width*f*sx,canvas.y+y*sy));return {sky:cols.filter(isSky).length,total:cols.length,sample:cols[Math.floor(cols.length/2)]};};
  const skyY=Math.round(s.street_view.button.y+s.street_view.button.height+12),groundY=Math.round(size.height-150);
  const sky=band(skyY),ground=band(groundY);
  assert.ok(sky.sky>=Math.ceil(sky.total*0.12),`the upper band shows sky at y=${skyY}: ${sky.sky}/${sky.total} sky samples`);
  assert.ok(ground.sky<=Math.floor(ground.total*0.05),`the lower band is street, not sky, at y=${groundY}: ${ground.sky}/${ground.total} sky samples`);
  // Phase 2 (docs/FIRST_PERSON_EXECUTION.md section 2): the walk stick is a touchscreen control only.
  if(!touch)assert.equal(s.street_view.stick.visible,false,'no walk stick without a touchscreen');
  if(touch&&size.width===390&&size.height===667)assert.ok(s.street_view.stick.visible&&s.street_view.stick.width>=44&&s.street_view.stick.height>=44,`the walk stick shows on a touchscreen ${JSON.stringify(s.street_view.stick)}`);
  // A drag in the play area turns the eye (page.mouse on desktop, a touchscreen drag on phones) and its release never routes.
  const area=s.play_area,dragPx=Math.min(90,area.width*0.3),fromX=area.x+area.width*0.3,fromY=area.y+area.height*0.42;
  const px=canvas.x+fromX*sx,py=canvas.y+fromY*sy,toX=canvas.x+(fromX+dragPx)*sx,steps=6;
  const dragBefore=s,dragYaw=s.street_view.yaw_deg;
  if(touch){const cdp=await page.context().newCDPSession(page);try{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:px,y:py,id:0}]});for(let i=1;i<=steps;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:px+(toX-px)*i/steps,y:py,id:0}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}finally{await cdp.detach();}}
  else{await page.mouse.move(px,py);await page.mouse.down();await page.mouse.move(toX,py,{steps});await page.mouse.up();}
  await settle();s=await snap();
  const dragTurn=((dragYaw-s.street_view.yaw_deg)%360+540)%360-180,dragExpect=dragPx*0.0085*180/Math.PI;
  assert.ok(dragTurn>dragExpect*0.5&&dragTurn<dragExpect*1.2,`a ${Math.round(dragPx)} px ${touch?'touch':'mouse'} drag turns the eye right by about ${dragExpect.toFixed(1)} degrees (${dragTurn.toFixed(1)})`);
  assert.ok(s.street_view.active&&s.following_player,'the drag keeps the eye on the player');
  assert.equal(s.street_view.taps_routed,dragBefore.street_view.taps_routed,'the release after a drag does not route');
  assert.deepEqual(s.street_view.contacts,[],'no contact is left held after the drag');
  assert.ok(Math.abs(s.player_grounding.x-dragBefore.player_grounding.x)<1e-3&&Math.abs(s.player_grounding.z-dragBefore.player_grounding.z)<1e-3,'the drag does not move the player');
  assert.equal(s.map_pinch.active,false,'a look drag never starts the map pinch');
  const eye={...s.street_view.eye},yaw=s.street_view.yaw_deg;
  // Shift+Right snaps the heading by 30 degrees without detaching from the player.
  await page.keyboard.press('Shift+ArrowRight');await settle();s=await snap();
  const turned=((s.street_view.yaw_deg-yaw)%360+540)%360-180;
  assert.ok(Math.abs(Math.abs(turned)-30)<0.5&&s.street_view.active,`Shift+Right snaps 30 degrees (${turned})`);
  // The button returns to the map view; the camera is orthographic and still follows the player.
  await tap(s.street_view.button);
  await page.waitForFunction(()=>!window.__tenderloinGodotA11ySnapshot.street_view.active);
  await settle();s=await snap();
  assert.equal(s.street_view.projection,1,'leaving street view restores the orthographic camera');
  assert.ok(s.following_player,'leaving street view keeps following the player');
  assert.deepEqual({yaw:s.camera_pose.yaw,pitch:s.camera_pose.pitch,size:s.camera_view_size},{yaw:before.camera_pose.yaw,pitch:before.camera_pose.pitch,size:before.camera_view_size},'the walking map comes back with its own heading, pitch and zoom');
  assert.equal(s.street_view.button.text,'Street view');
  assert.match(s.announcement,/Map view/,'leaving street view is announced');
  // Shift+F again resumes with the kept heading; Shift+F once more leaves.
  await page.keyboard.press('Shift+F');await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.street_view.active);await settle();s=await snap();
  assert.ok(Math.abs((((s.street_view.yaw_deg-yaw-turned)%360)+540)%360-180)<0.5,'re-entering keeps the turned heading');
  await page.keyboard.press('Shift+F');await page.waitForFunction(()=>!window.__tenderloinGodotA11ySnapshot.street_view.active);await settle();s=await snap();
  assert.equal(s.street_view.projection,1);
  const result={...size,touch,eye,yaw,turned,dragTurn,dragExpect,stick:dragBefore.street_view.stick,sky,ground,skyY,groundY};
  await writeFile(`${outputDir}/street-view-${size.width}x${size.height}-${touch?'touch':'mouse'}.json`,JSON.stringify(result,null,1));
  return result;
}
