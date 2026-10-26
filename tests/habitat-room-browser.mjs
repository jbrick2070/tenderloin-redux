import assert from 'node:assert/strict';

// Inspect the actual raster at its drawn frame bounds. Sparse grids can miss
// the original close-framed chair/ring strokes and alias two distinct pictures.
function inspectFilmFrame(pixels,canvas,size,{x,y,width,height},shot,framing,view) {
  let paper=0,border=0,green=0,pink=0,ring=0,panel=0;const samples=[];
  const zoom=framing==='close'?1.2:1,tx=framing==='close'?-30:0,ty=framing==='close'?-8:0;
  for(let py=Math.round(y);py<Math.round(y+height);py++)for(let px=Math.round(x);px<Math.round(x+width);px++){
    const p=pixels.pixel(canvas.x+px*canvas.width/size.width,canvas.y+py*canvas.height/size.height),[r,g,b]=p,sx=(px-x)/width*420,sy=(py-y)/height*236;
    if(p.every(v=>v>165))paper++;if(p.every(v=>v<140))border++;
    if(sx>25&&sx<395&&sy>30&&sy<185){if(r<g*.85&&b<g*1.2&&g<180)green++;if(r>g+18&&b>g+5&&r>130){
      pink++;
      if(Math.abs(sx-(270*zoom+tx))<36*zoom&&Math.abs(sy-(116*zoom+ty))<36*zoom)ring++;
      if(Math.abs(sx-(124*zoom+tx))<21*zoom&&Math.abs(sy-(87*zoom+ty))<21*zoom)panel++;
    }}
    samples.push(p.map(v=>Math.floor(v/16)).join(','));
  }
  assert.ok(paper>40&&border>3&&(shot==='paint'?pink>3:green>3),`${view} frame in intended place retains source motif: ${shot}/${paper}/${border}/${green}/${pink}`);
  assert.ok(shot==='welcome'?ring>3&&panel===0:shot==='paint'?panel>3&&ring===0:ring===0&&panel===0,`${view} ordered frame retains its specific original ring/panel/chair identity: ${shot}/${ring}/${panel}`);
  return {evidence:{shot,paper,border,green,pink,ring,panel},fingerprint:samples.join('|')};
}

export async function verifyHabitatRoom(page,{touch,size,renderedPixels,outputDir='artifacts',privateFixture=false}) {
  const snap=()=>page.evaluate(()=>window.__tenderloinGodotA11ySnapshot);
  const storage=()=>page.evaluate(()=>Object.fromEntries(['tenderloin-redux.godot.save.v1','tenderloin-redux.godot.settings.v1','tenderloin-redux.save.v1'].map(k=>[k,localStorage.getItem(k)])));
  async function settle(){const f=(await snap()).ui_frame;await page.waitForFunction(f=>{const s=window.__tenderloinGodotA11ySnapshot;return s.ui_frame>f+4&&!s.layout_refit_pending&&!s.habitat_room.layout_pending&&!s.helper_bench.layout_pending&&!s.film_screening.layout_pending;},f);}
  async function tap(b){const s=await snap(),c=await page.locator('#canvas').boundingBox();assert.ok(b.visible&&!b.disabled&&b.width>=44&&b.height>=44);if(Object.hasOwn(b,"text_fits"))assert.equal(b.text_fits,true);assert.ok(b.x>=-1&&b.y>=-1&&b.x+b.width<=s.viewport_width+1&&b.y+b.height<=s.viewport_height+1);const x=c.x+(b.x+b.width/2)*c.width/s.viewport_width,y=c.y+(b.y+b.height/2)*c.height/s.viewport_height;if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);await settle();}
  async function enter(){await page.keyboard.press('F4');await settle();assert.ok((await snap()).film_screening.visible);await tap((await snap()).film_screening.buttons.find(b=>b.text==='Helper workshop'));let s=await snap();assert.ok(s.helper_bench.visible);await tap(s.helper_bench.buttons.find(b=>b.text==='Habitat room'));assert.ok((await snap()).habitat_room.visible);}
  // Input delivery can precede the next published Godot snapshot. Establish
  // the pre-entry baseline after startup dismissal and deferred frame work.
  await page.waitForFunction(size=>{const s=window.__tenderloinGodotA11ySnapshot;return s&&!s.startup_pending&&Math.abs(s.viewport_width-size.width)<1&&Math.abs(s.viewport_height-size.height)<1;},size);
  await settle();
  const stable=await storage(),saved=JSON.parse(stable['tenderloin-redux.godot.save.v1']),original=await snap(),quiet=[original.music_playing,original.music_volume,original.reward_sounds_enabled];
  assert.ok(!original.startup_pending&&Math.abs(original.viewport_width-size.width)<1&&Math.abs(original.viewport_height-size.height)<1);
  const framing=s=>[s.camera_pose,s.camera_view_size,s.following_player,s.in_overview,s.in_wide_overview],framingBefore=framing(original);
  const visibility=s=>({block:s.block_panel_control.visible,controls:s.controls_control.visible,walking:s.walking_controls.map(c=>({text:c.text,visible:c.visible}))}),visibilityBefore=visibility(original),focusBefore=original.habitat_room.focus_owner,returnChecks=[],helperMovements=[];
  async function returned(label){const s=await snap();assert.ok(!s.habitat_room.visible&&!s.helper_bench.visible&&!s.film_screening.visible);assert.deepEqual(visibility(s),visibilityBefore,`${label} restores pre-entry street controls`);assert.ok(s.habitat_room.focus_owner===focusBefore||s.habitat_room.film_focus,`${label} restores prior focus or the original film fallback`);returnChecks.push(label);}
  assert.equal(saved.film.phase,'done');assert.ok(original.habitat_room.available&&!original.habitat_room.complete);const helperBefore=original.helper_bench.world;
  await enter();let s=await snap(),h=s.habitat_room;assert.deepEqual(framing(s),framingBefore,'entry preserves settled pre-entry camera including zoom');const pose=s.camera_pose,ground=[s.player_grounding.x,s.player_grounding.z];assert.deepEqual(h.assigned,{});assert.ok(h.focus_within);
  const first=await renderedPixels(page),offset=size.width===1100?0:size.width===390?1:2;
  await tap(h.buttons[9]);await returned('empty Keep');await enter();assert.deepEqual((await snap()).habitat_room.assigned,{});
  for(let i=0;i<3;i++){
    await tap((await snap()).habitat_room.buttons[i]);await tap((await snap()).habitat_room.buttons[3+(i+offset)%4]);
    const oldHelper=(await snap()).habitat_room.helper_rect,beforeCarry=await renderedPixels(page);await tap((await snap()).habitat_room.buttons[7]);
    h=(await snap()).habitat_room;assert.equal(Object.keys(h.assigned).length,i+1);assert.ok(!h.complete);const partial=h.assigned;
    const nowHelper=h.helper_rect,carryPixels=await renderedPixels(page),carryCanvas=await page.locator('#canvas').boundingBox();assert.ok(h.helper_visible&&Math.abs(nowHelper.x-oldHelper.x)+Math.abs(nowHelper.y-oldHelper.y)>1);
    assert.ok(nowHelper.x>h.art.x+301*h.art.width/720&&nowHelper.x+nowHelper.width<h.art.x+419*h.art.width/720&&nowHelper.y>h.art.y+25*h.art.height/480&&nowHelper.y+nowHelper.height<h.art.y+100*h.art.height/480,'helper stays outside module and passage bounds');
    let amber=0,teal=0,changed=0;
    for(let y=Math.floor(Math.min(oldHelper.y,nowHelper.y));y<Math.ceil(Math.max(oldHelper.y+oldHelper.height,nowHelper.y+nowHelper.height));y++)for(let x=Math.floor(Math.min(oldHelper.x,nowHelper.x));x<Math.ceil(Math.max(oldHelper.x+oldHelper.width,nowHelper.x+nowHelper.width));x++){
      const px=carryCanvas.x+x*carryCanvas.width/size.width,py=carryCanvas.y+y*carryCanvas.height/size.height,p=carryPixels.pixel(px,py);if(beforeCarry.pixel(px,py).some((v,k)=>Math.abs(v-p[k])>30))changed++;
      if(x>=nowHelper.x&&x<nowHelper.x+nowHelper.width&&y>=nowHelper.y&&y<nowHelper.y+nowHelper.height){if(p.every((v,k)=>Math.abs(v-[218,158,73][k])<32))amber++;if(p.every((v,k)=>Math.abs(v-[95,156,146][k])<32))teal++;}
    }assert.ok(changed>=5&&amber>3&&teal>3,`actual helper carry pose retains amber/teal and visibly moves: ${changed}/${amber}/${teal}`);helperMovements.push({item:i,changed,amber,teal,drawn:nowHelper});
    await tap(h.buttons[9]);await returned(`partial ${i+1} Keep`);await enter();assert.deepEqual((await snap()).habitat_room.assigned,partial);
    if(i===0){await page.keyboard.press('Escape');await settle();await returned('partial Escape');await enter();assert.deepEqual((await snap()).habitat_room.assigned,partial);}
  }
  h=(await snap()).habitat_room;assert.equal(h.buttons[7].text,'Welcome Thanh');await tap(h.buttons[7]);h=(await snap()).habitat_room;
  assert.ok(h.complete&&h.buttons[7].disabled);assert.match(h.text,/^Thanh:.*left the/s);assert.match(h.text,/Celeste:/);assert.match(h.text,/Dez:/);assert.deepEqual(h.copies.film,saved.film.result);assert.deepEqual(h.copies.civic,saved.civic.result);
  const hosted=Object.fromEntries(saved.hosting.results.map(x=>[x.id,x.value]));assert.deepEqual(h.copies.art,hosted.art);assert.equal(h.copies.pause,hosted.pause);assert.equal(h.copies.beats,hosted.beats);
  const last=await renderedPixels(page),canvas=await page.locator('#canvas').boundingBox();let changed=0;
  for(let y=h.art.y+4;y<h.art.y+h.art.height-4;y+=4)for(let x=h.art.x+4;x<h.art.x+h.art.width-4;x+=4){const px=canvas.x+x*canvas.width/size.width,py=canvas.y+y*canvas.height/size.height;if(first.pixel(px,py).some((v,k)=>Math.abs(v-last.pixel(px,py)[k])>30))changed++;}
  assert.ok(changed>=50,'deliberate placements visibly build a room, beyond state text');
  const filmPlace=['entry','window','wall','side'].findIndex(id=>h.assigned[id]==='film'),spots=[[42,258],[422,30],[42,30],[422,258]],filmColors=[];
  const roomFrames=[];
  for(let f=0;f<3;f++){
    const x0=h.art.x+(spots[filmPlace][0]+(256-222*.4)/2+6*.4)*h.art.width/720,y0=h.art.y+(spots[filmPlace][1]+30+(154-372*.4)/2+(6+f*122)*.4)*h.art.height/480,w=210*.4*h.art.width/720,hh=118*.4*h.art.height/480;
    const result=inspectFilmFrame(last,canvas,size,{x:x0,y:y0,width:w,height:hh},saved.film.result.order[f],saved.film.result.framing,'room');roomFrames.push(result.evidence);filmColors.push(result.fingerprint);
  }
  assert.equal(new Set(filmColors).size,3,'room contains all three distinct ordered copied film frames');await page.screenshot({path:`${outputDir}/habitat-${size.width}-room.png`});
  const detailEvidence=[];
  for(let i=0;i<3;i++){
    await tap((await snap()).habitat_room.buttons[i]);await tap((await snap()).habitat_room.buttons[8]);h=(await snap()).habitat_room;assert.ok(h.detail&&h.complete);
    const pixels=await renderedPixels(page),c=await page.locator('#canvas').boundingBox(),colors=new Set();let paper=0,ink=0;
    for(let y=h.art.y+3;y<h.art.y+h.art.height-3;y+=3)for(let x=h.art.x+3;x<h.art.x+h.art.width-3;x+=3){const p=pixels.pixel(c.x+x*c.width/size.width,c.y+y*c.height/size.height);if(p.every(v=>v>165))paper++;if(p.every(v=>v<140))ink++;colors.add(p.map(v=>Math.floor(v/16)).join(','));}
    assert.ok(paper>40&&colors.size>8,`actual detail has paper and original colors ${i}: ${paper}/${colors.size}`);
    const tileEvidence=[];
    if(i===0){
      const palettes={warm:[[229,182,109],[217,162,178],[117,144,124]],cool:[[145,186,194],[163,180,140],[152,123,158]]};
      for(let tile=0;tile<6;tile++){let pigment=0,motif=0;const expected=palettes[hosted.art.palette][hosted.art.tiles[tile]];
        for(let yy=10;yy<89;yy+=7)for(let xx=10;xx<89;xx+=7){const x=h.art.x+(24+tile%3*106+xx)*h.art.width/360,y=h.art.y+(20+Math.floor(tile/3)*106+yy)*h.art.height/240,p=pixels.pixel(c.x+x*c.width/size.width,c.y+y*c.height/size.height);if(p.every((v,k)=>Math.abs(v-expected[k])<28))pigment++;if(p.every((v,k)=>Math.abs(v-[248,236,217][k])<28))motif++;}
        assert.ok(pigment>8&&motif>3,`actual copied tile ${tile} retains palette and cream motif: ${pigment}/${motif}`);tileEvidence.push({tile,shape:hosted.art.tiles[tile],pigment,motif});
      }
    }else assert.ok(ink>8,`film/seats retain authored dark outlines ${i}: ${ink}`);
    const frames=[],frameEvidence=[];
    if(i===1){for(let f=0;f<3;f++){
      const rect={x:h.art.x+6*h.art.width/222,y:h.art.y+(6+f*122)*h.art.height/372,width:210*h.art.width/222,height:118*h.art.height/372};
      const result=inspectFilmFrame(pixels,c,size,rect,saved.film.result.order[f],saved.film.result.framing,'detail');frames.push(result.fingerprint);frameEvidence.push(result.evidence);
    }assert.equal(new Set(frames).size,3,'three ordered original film pictures visibly differ');}
    detailEvidence.push({tileEvidence,frameEvidence,item:['art','film','seats'][i],paper,ink,colors:colors.size,distinctFilmFrames:frames.length?new Set(frames).size:null,drawn:h.art});
    await page.screenshot({path:`${outputDir}/habitat-${size.width}-detail-${i}.png`});
    if(i===1){await page.keyboard.press('Escape');await settle();await returned('detail Escape');await enter();h=(await snap()).habitat_room;assert.ok(h.detail&&h.complete);}
    await tap(h.buttons[8]);
  }
  const places=['entry','window','wall','side'],prior=(await snap()).habitat_room.assigned,oldPlace=places.findIndex(id=>prior[id]==='art'),spare=places.findIndex(id=>!Object.hasOwn(prior,id));
  await tap((await snap()).habitat_room.buttons[0]);await tap((await snap()).habitat_room.buttons[3+spare]);
  h=(await snap()).habitat_room;assert.deepEqual(h.assigned,prior);assert.ok(h.complete,'selection alone never clears the welcome');const beforeMove=await renderedPixels(page);
  await tap(h.buttons[7]);h=(await snap()).habitat_room;assert.ok(!h.complete&&Object.keys(h.assigned).length===3);assert.equal(h.assigned[places[spare]],'art');assert.ok(!Object.hasOwn(h.assigned,places[oldPlace]));
  const moved=await renderedPixels(page),moveCanvas=await page.locator('#canvas').boundingBox(),relocation=[];
  for(const place of [oldPlace,spare]){let changed=0;const [sx,sy]=spots[place];
    for(let y=h.art.y+(sy+35)*h.art.height/480;y<h.art.y+(sy+180)*h.art.height/480;y+=3)for(let x=h.art.x+(sx+16)*h.art.width/720;x<h.art.x+(sx+240)*h.art.width/720;x+=3){
      const px=moveCanvas.x+x*moveCanvas.width/size.width,py=moveCanvas.y+y*moveCanvas.height/size.height;if(beforeMove.pixel(px,py).some((v,k)=>Math.abs(v-moved.pixel(px,py)[k])>30))changed++;
    }assert.ok(changed>=50,`actual relocation changes the old/new copy interior: ${places[place]}/${changed}`);relocation.push({place:places[place],changed});
  }
  const arrangement=h.assigned;await tap(h.buttons[9]);await returned('rearranged Keep');await enter();h=(await snap()).habitat_room;assert.deepEqual(h.assigned,arrangement);assert.ok(!h.complete);assert.equal(h.buttons[7].text,'Welcome Thanh');await tap(h.buttons[7]);h=(await snap()).habitat_room;assert.ok(h.complete);assert.deepEqual(h.copies.film,saved.film.result);assert.deepEqual(h.copies.art,hosted.art);
  await page.screenshot({path:`${outputDir}/habitat-${size.width}-rearranged.png`});
  for(const viewport of [{width:320,height:568},{width:520,height:360},size]){
    await page.setViewportSize(viewport);await settle();h=(await snap()).habitat_room;
    for(const b of [h.top,h.tray,h.picture,h.art,...h.buttons])assert.ok(b.x>=-1&&b.y>=-1&&b.x+b.width<=viewport.width+1&&b.y+b.height<=viewport.height+1,'actual room art and whole-word controls fit resize');
    assert.ok(h.buttons.every(b=>b.width>=44&&b.height>=44&&b.text_fits));assert.ok(h.reader.height>=64&&h.art.width>=180&&h.art.height>=120);assert.deepEqual(h.assigned,arrangement);
  }
  await page.keyboard.press('End');await settle();h=(await snap()).habitat_room;assert.ok(h.scroll_max>0&&Math.abs(h.scroll-h.scroll_max)<1);
  await page.keyboard.press('Shift+F8');await page.keyboard.press('F4');await settle();s=await snap();assert.ok(s.habitat_room.visible&&!s.story_picker.visible&&!s.film_screening.visible);assert.deepEqual(s.camera_pose,pose);
  await page.keyboard.down('KeyW');await tap(s.habitat_room.buttons[9]);await settle();s=await snap();assert.ok(s.habitat_room.release_pending);assert.deepEqual([s.player_grounding.x,s.player_grounding.z],ground);await page.keyboard.up('KeyW');await settle();assert.ok(!(await snap()).habitat_room.release_pending);
  s=await snap();assert.deepEqual(framing(s),framingBefore,'exit preserves original camera including zoom and follow intent');assert.deepEqual(s.helper_bench.world,helperBefore,'habitat creates no street furniture or camera change');assert.deepEqual(await storage(),stable);assert.deepEqual([s.music_playing,s.music_volume,s.reward_sounds_enabled],quiet);
  await returned('completed held-key Keep');await enter();h=(await snap()).habitat_room;assert.deepEqual(h.assigned,arrangement);assert.ok(h.complete);await page.keyboard.press('Escape');await settle();await returned('completed Escape');
  await page.reload();await page.locator('#status').waitFor({state:'hidden',timeout:60000});await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.startup_pending);await page.keyboard.press('Escape');await settle();s=await snap();assert.ok(s.habitat_room.available&&!s.habitat_room.complete);assert.deepEqual(s.habitat_room.assigned,{});
  const loaded=await storage();assert.deepEqual(JSON.parse(loaded['tenderloin-redux.godot.save.v1']),saved);assert.equal(loaded['tenderloin-redux.save.v1'],stable['tenderloin-redux.save.v1']);
  await enter();assert.ok(!(await snap()).helper_bench.complete,'retained habitat invitation never requires rebuilding helper');await tap((await snap()).habitat_room.buttons[9]);
  if((await snap()).music_playing!==quiet[0])await tap((await snap()).music_toggle_control);s=await snap();assert.deepEqual([s.music_playing,s.music_volume,s.reward_sounds_enabled],quiet);
  return {...size,touch,privateFixture,changed,roomFrames,detailEvidence,helperMovements,returnChecks,relocation,arrangement,framingBefore,copiedFilm:saved.film.result,copiedArt:hosted.art,actualReload:true,retainedInvitation:true,noWrites:true,quiet:true};
}
