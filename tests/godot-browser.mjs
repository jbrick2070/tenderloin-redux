import { mkdir, stat, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { initialState, applyAction, serializeSave } from '../public/core.js';
import { postcardSVG } from '../public/keepsake.js';
import { programmeSVG, SEGMENTS, programmeResponse } from '../public/programme.js';
import { tilePanelSVG, QUIET_CHOICES, STORY_CHOICES } from '../public/hosting.js';
import { civicPlanSVG, civicConversation } from '../public/civic.js';
import { filmFrameSVG, filmCaption } from '../public/film.js';
const [pckStat, ...sourceStats] = await Promise.all([
  stat('artifacts/godot-web/index.pck'),
  stat('godot/main.gd'),
  stat('godot/film_screening.gd'),
  stat('godot/civic_listening.gd'),
  stat('godot/programme_studio.gd'),
  stat('godot/shared_panel.gd'),
  stat('godot/loan_homecoming.gd'),
  stat('godot/power_story.gd'),
  stat('godot/dog_story.gd'),
  stat('godot/power_place.gd'),
  stat('godot/data/power_place.json'),
  stat('godot/tests/study_test.gd'),
  stat('godot/quiet_seats.gd'),
  stat('godot/bea_invitation.gd'),
  stat('godot/mural_workshop.gd'),
  stat('godot/rhythm_circle.gd'),
  stat('godot/rhythm_bar.gd'),
  stat('godot/mural_signature.gd'),
  stat('godot/mural_stories.gd'),
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
const sourceFingerprint={sources:Object.fromEntries(await Promise.all(['godot/main.gd','godot/shared_panel.gd','godot/loan_homecoming.gd','godot/power_story.gd','godot/dog_story.gd','godot/lantern_procession.gd','godot/story_picker.gd','godot/voting_story.gd','godot/data/voting_places.json','godot/power_place.gd','godot/data/power_place.json','godot/tests/study_test.gd'].map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')]))),pack_sha256:createHash('sha256').update(await readFile('artifacts/godot-web/index.pck')).digest('hex')};
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
let rhythmFixtureSave;
const rhythmCircleChecks = [];
const filmScreeningChecks = [];
const quietSeatChecks = [];
const beaInvitationChecks = [];
const civicListeningChecks = [];
const rhythmAuditionChecks = [];
const muralWorkshopChecks = [];
let workshopAutoAdvanceChecks = 0;

// Decode browser screenshots locally, so art checks inspect rendered pixels, not a test hook.
function screenshotPixels(png) {
  let at=8,width,height,channels;const chunks=[];
  while(at<png.length){const n=png.readUInt32BE(at),type=png.toString('ascii',at+4,at+8),data=png.subarray(at+8,at+8+n);if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);assert.equal(data[8],8);assert.ok([2,6].includes(data[9]));channels=data[9]===6?4:3;}if(type==='IDAT')chunks.push(data);at+=n+12;}
  const raw=inflateSync(Buffer.concat(chunks)),stride=width*channels,out=Buffer.alloc(height*stride);let pos=0;
  const paeth=(a,b,c)=>{const p=a+b-c,x=Math.abs(p-a),y=Math.abs(p-b),z=Math.abs(p-c);return x<=y&&x<=z?a:y<=z?b:c;};
  for(let y=0;y<height;y++){const filter=raw[pos++];assert.ok(filter<=4);for(let x=0;x<stride;x++){const a=x>=channels?out[y*stride+x-channels]:0,b=y?out[(y-1)*stride+x]:0,c=y&&x>=channels?out[(y-1)*stride+x-channels]:0;out[y*stride+x]=(raw[pos++]+[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter])&255;}}
  return {width,height,pixel:(x,y)=>[...out.subarray((Math.floor(y)*width+Math.floor(x))*channels,(Math.floor(y)*width+Math.floor(x))*channels+3)]};
}

async function verifyPaintedMuralPixels(page,s) {
  const w=s.mural_workshop,art=w.art,pixels=screenshotPixels(await page.screenshot()),canvas=await page.locator('#canvas').boundingBox();
  const point=(x,y)=>pixels.pixel(canvas.x+x*canvas.width/s.viewport_width,canvas.y+y*canvas.height/s.viewport_height);
  const paper=art.paper.match(/../g).map(x=>parseInt(x,16));
  assert.ok(w.cells.every(b=>b.text===''&&b.accessible_name.includes(`Column ${b.col+1}, row ${b.row+1}`)),'canvas has meaningful named targets without numbered tile captions');
  assert.equal(art.motifs.length,3);assert.equal(art.slot_marks,15);
  const samples=[];
  for(const mark of art.motifs){
    let ink=0,pale=0,total=0;
    for(let y=mark.y+2;y<mark.y+mark.height-2;y+=1)for(let x=mark.x+2;x<mark.x+mark.width-2;x+=1){const rgb=point(x,y);total++;if(rgb.reduce((a,b)=>a+b,0)<paper.reduce((a,b)=>a+b,0)-120)ink++;if(rgb.every((v,i)=>Math.abs(v-paper[i])<30))pale++;}
    assert.ok(ink>=12&&pale>total*.15,`${mark.id} renders visible individual strokes on paper (${ink}/${total}), not a filled tile`);samples.push({id:mark.id,ink,paper:pale,total});
  }
  let dots=0;
  for(const cell of w.cells.filter(b=>!b.occupant)){
    let darkest=Infinity;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)darkest=Math.min(darkest,point(cell.x+cell.width/2+dx,cell.y+cell.height/2+dy).reduce((a,b)=>a+b,0));
    assert.ok(darkest<paper.reduce((a,b)=>a+b,0)-35,'an actual pencil registration dot is visible at every open spot');dots++;
  }
  assert.equal(dots,15);
  const pair=w.cells.find((b,i)=>b.col<5&&!b.occupant&&!w.cells[i+1].occupant&&![art.active_cell,art.guide_cell].includes(i)&&![art.active_cell,art.guide_cell].includes(i+1));
  assert.ok(pair,'real adjacent empty spots exist for the non-grid visual check');
  const seam=point(pair.x+pair.width,pair.y+pair.height*.2);
  assert.ok(seam.every((v,i)=>Math.abs(v-paper[i])<25),'adjacent empty spots share continuous paper, with no dark cell border');
  return {motifs:samples,visibleDots:dots,seam,paper};
}

async function verifyMuralSignaturePixels(page,s) {
  const pixels=screenshotPixels(await page.screenshot()),c=await page.locator('#canvas').boundingBox(),icons=[];
  for(const icon of s.mural_workshop.signature.icons){let ink=0,paper=0;for(let y=icon.y+1;y<icon.y+icon.height-1;y++)for(let x=icon.x+1;x<icon.x+icon.width-1;x++){
    const rgb=pixels.pixel(c.x+x*c.width/s.viewport_width,c.y+y*c.height/s.viewport_height);if(rgb.reduce((n,v)=>n+v,0)<480)ink++;if(rgb[0]>215&&rgb[1]>190&&rgb[2]>150)paper++;
  }assert.ok(ink>=8&&paper>=20,`${icon.id} original instrument/block-life ink actually renders separately on paper`);icons.push({id:icon.id,ink,paper});}
  assert.deepEqual(icons.map(i=>i.id),['brass','drum','tea','heart']);return icons;
}

// Reuse real native disclosure input before a canonical control is measured/tapped.
// This only reveals the same named target; it never invokes game callbacks.
async function revealPhoneControl(page,b,tap){
 assert.ok(b,'a named native target exists');
 if(b.visible!==false)return b;
 let s=await page.evaluate(()=>window.__tenderloinGodotA11ySnapshot);
 assert.ok(s.phone_disclosure?.enabled,'hidden targets must be disclosed, not clicked');
 const index=s.walking_controls.findIndex((v,i)=>i>=1&&i<=4&&v.text===b.text);
 if(index>=1){
  assert.ok(s.phone_disclosure.explore.visible,'Explore must be visibly available');
  await tap(s.phone_disclosure.explore);
  await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.phone_disclosure.tray.visible);
  s=await page.evaluate(()=>window.__tenderloinGodotA11ySnapshot);b=s.walking_controls[index];
 }else throw new Error('Hidden target is not a canonical map secondary; explicitly disclose its own menu first');
 assert.ok(b?.visible,'disclosure must expose the actual native target');return b;
}
function assertWalkingCaptions(s){
 const expected=["What's Next?",'Tenderloin Map','Find Me','Zoom In (+)','Zoom Out (−)','Walk & Talk (Next)'];
 if(s.phone_disclosure?.enabled){assert.ok(['Next Step','Back to Me'].includes(s.walking_controls[0].text));assert.deepEqual(s.walking_controls.slice(1).map(b=>b.text),expected.slice(1));}
 else assert.deepEqual(s.walking_controls.map(b=>b.text),expected);
}
async function phoneAwareMouseClick(page,b){
 b=await revealPhoneControl(page,b,btn=>phoneAwareMouseClick(page,btn));
 const s=await page.evaluate(()=>window.__tenderloinGodotA11ySnapshot),c=await page.locator('#canvas').boundingBox();
 assert.ok(b.visible,'mouse activation only targets visible native controls');
 await page.mouse.click(c.x+(b.x+b.width/2)*c.width/s.viewport_width,c.y+(b.y+b.height/2)*c.height/s.viewport_height);
 const f=s.ui_frame;await page.waitForFunction(f=>window.__tenderloinGodotA11ySnapshot.ui_frame>f+4,f);
}

async function verifyStreetSignature(page,tap,snap) {
  let s=await snap();
  await tap(s.mural_detail.buttons.at(-1));
  // Map deliberately dismisses transients using the original game action, not a test timer hook.
  await tap((await snap()).walking_controls[1]);
  await tap((await snap()).walking_controls[2]);
  await page.keyboard.press('KeyM');
  await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.mural_detail.panel.visible&&!window.__tenderloinGodotA11ySnapshot.player_grounding.path_active);
  s=await snap();
  await tap(s.mural_detail.buttons.at(-1));
  s=await snap();
  assert.equal(s.overlays.reward.remaining,0,'actual Map dismisses the transient before inspecting world ink');
  for(let i=0;i<2;i++){const plus=s.walking_controls.find(b=>b.text.includes('Zoom')&&b.text.includes('+'));await tap(plus);s=await snap();}
  {
    const q=s.mural_signature_world.corners,center={x:q.reduce((a,p)=>a+p.x,0)/4,y:q.reduce((a,p)=>a+p.y,0)/4},r=s.play_area,dx=r.x+r.width*.55-center.x,dy=r.y+r.height*.5-center.y,c=await page.locator('#canvas').boundingBox();
    const x=c.x+(r.x+r.width*.5)*c.width/s.viewport_width,y=c.y+(r.y+r.height*.25)*c.height/s.viewport_height;
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx*c.width/s.viewport_width,y+dy*c.height/s.viewport_height,{steps:10});await page.mouse.up();
    const frame=s.ui_frame;await page.waitForFunction(f=>window.__tenderloinGodotA11ySnapshot.ui_frame>f+4,frame);s=await snap();
  }
  const corners=s.mural_signature_world.corners;for(const q of corners)assert.ok(q.x>=s.play_area.x&&q.y>=s.play_area.y&&q.x<=s.play_area.x+s.play_area.width&&q.y<=s.play_area.y+s.play_area.height,'actual world ink is uncovered inside play area');
  const pixels=screenshotPixels(await page.screenshot()),c=await page.locator('#canvas').boundingBox();
  assert.ok(s.mural_signature_world.visible);
  const p=(u,v)=>({x:(corners[0].x*(1-u)+corners[1].x*u)*(1-v)+(corners[2].x*(1-u)+corners[3].x*u)*v,y:(corners[0].y*(1-u)+corners[1].y*u)*(1-v)+(corners[2].y*(1-u)+corners[3].y*u)*v});
  let ink=0,paper=0;const bins=[0,0,0,0];for(let u=.02;u<.98;u+=.005)for(let v=.15;v<.85;v+=.1){const q=p(u,v);assert.ok(q.x>=0&&q.y>=0&&q.x<s.viewport_width&&q.y<s.viewport_height,'street banner remains on-screen');const rgb=pixels.pixel(c.x+q.x*c.width/s.viewport_width,c.y+q.y*c.height/s.viewport_height);if(rgb.reduce((n,v)=>n+v,0)<480){ink++;bins[Math.min(3,Math.floor(u*4))]++;}if(rgb[0]>215&&rgb[1]>190&&rgb[2]>150)paper++;}
  assert.ok(bins.every(n=>n>=3),'each of all4 real-world icon quarters has actual ink after BoxMesh UV correction');
  assert.ok(ink>=12&&paper>=30,'the actual existing3D completion banner renders original ink on paper after real zoom inputs');
  await page.screenshot({path:`artifacts/codex-mural-street-signature-${s.viewport_width}x${s.viewport_height}.png`});return {ink,paper,bins,corners};
}

// Observe the real WebAudio mixer destination; never create a test tone or action hook.
function installRhythmAudioProbe() {
  window.__rhythmOutputTaps=[];
  const connect=AudioNode.prototype.connect,mixers=new WeakMap();
  const code=`class MixerEnvelope extends AudioWorkletProcessor {
    constructor(){super();this.capture=0;this.reset();this.frames=Math.round(sampleRate*.016);this.port.onmessage=e=>{this.capture=e.data.capture;this.reset();};}
    reset(){this.energy=0;this.count=0;this.total=0;this.lastQuantum=null;this.clockJumps=0;}
    process(inputs,outputs){const channels=inputs[0]||[],length=outputs[0][0].length;
      if(this.lastQuantum!==null&&currentFrame!==this.lastQuantum)this.clockJumps++;
      this.lastQuantum=currentFrame+length;
      for(let i=0;i<length;i++){
        let energy=0;for(const c of channels)energy+=c[i]*c[i];this.energy+=channels.length?energy/channels.length:0;this.count++;this.total++;
        if(this.count===this.frames){this.port.postMessage({capture:this.capture,ms:(this.total-this.count)/sampleRate*1000,rms:Math.sqrt(this.energy/this.count),frames:this.count,expected:this.frames,clock_frame:currentFrame+i,clock_jumps:this.clockJumps});this.energy=0;this.count=0;}
      }return true;
    }
  }registerProcessor('mixer-envelope',MixerEnvelope);`;
  AudioNode.prototype.connect=function(destination,...ports){
    const result=connect.call(this,destination,...ports);
    if(destination instanceof AudioDestinationNode){
      const source=this,context=this.context;
      if(!mixers.has(context)){
      const tap={context,trace:[],error:null,ready:false};window.__rhythmOutputTaps.push(tap);
      const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));
      const ready=context.audioWorklet.addModule(url).finally(()=>URL.revokeObjectURL(url)).then(()=>{
        const node=new AudioWorkletNode(context,'mixer-envelope');tap.node=node;
        node.port.onmessage=e=>{tap.trace.push(e.data);if(tap.trace.length>2000)tap.trace.splice(0,tap.trace.length-2000);};
        // The observer's output is silence; the original destination connection remains audible.
        connect.call(node,destination);tap.ready=true;return node;
      }).catch(e=>{tap.error=String(e);throw e;});
      mixers.set(context,ready);
      }
      mixers.get(context).then(node=>connect.call(source,node,ports[0]||0,0)).catch(()=>{});
    }return result;
  };
}

async function verifyRhythmAudition(page,touch,size,tap,snap,save,settle,active) {
  const initial=(await snap()).rhythm_circle.pattern,wasMusic=(await snap()).music_playing;
  const setMask=async mask=>{for(let bit=0;bit<8;bit++)if(((await snap()).rhythm_circle.pattern^mask)&(1<<bit))await tap((await snap()).rhythm_circle.pads[bit]);};
  let audioMark=0;
  const start=async()=>{await page.waitForFunction(()=>window.__rhythmOutputTaps?.length&&window.__rhythmOutputTaps.every(t=>t.ready||t.error));audioMark=await page.evaluate(()=>{const t=window.__rhythmOutputTaps;if(t.length!==1||t[0].error)throw new Error('Expected one ready actual mixer observer: '+JSON.stringify(t.map(x=>x.error)));window.__rhythmInputAudioMark=null;window.addEventListener('pointerdown',()=>{window.__rhythmInputAudioMark=(window.__rhythmCaptureSerial||0)+1;window.__rhythmCaptureSerial=window.__rhythmInputAudioMark;t[0].node.port.postMessage({capture:window.__rhythmInputAudioMark});},{once:true,capture:true});return 0;});const n=(await snap()).rhythm_circle.audition.starts;await tap((await snap()).rhythm_circle.options[6]);audioMark=await page.evaluate(()=>window.__rhythmInputAudioMark);assert.ok(Number.isFinite(audioMark),'real pointer event timestamps mixer capture');await page.waitForFunction(n=>{const a=window.__tenderloinGodotA11ySnapshot.rhythm_circle.audition;return a.playing&&a.starts===n+1;},n);};
  if(!wasMusic)await tap((await snap()).rhythm_circle.options[1]);
  if((await snap()).music_mode==='local'){
    await tap((await snap()).rhythm_circle.options[6]);assert.ok(!(await snap()).rhythm_circle.audition.playing);assert.match((await snap()).rhythm_circle.message,/Local music/);
    if(!wasMusic)await tap((await snap()).rhythm_circle.options[1]);return;
  }
  await setMask(129);
  const frozen=await save(),pose=(await snap()).camera_pose;
  const capture=async()=>{
    await page.waitForFunction(mark=>window.__rhythmOutputTaps[0].trace.some(t=>t.capture===mark&&t.ms>=2990),audioMark);
    const trace=await page.evaluate(mark=>window.__rhythmOutputTaps[0].trace.filter(t=>t.capture===mark&&t.ms<3000),audioMark);
    await writeFile(`artifacts/rhythm-capture-${size.width}-${active?'hosting':'practice'}-${(await snap()).rhythm_circle.pattern}.json`,JSON.stringify(trace,null,2));
    assert.ok(trace.length>=180&&trace[0].ms<25&&trace.at(-1).ms>2970,'complete three-second audio-thread coverage');
    assert.ok(trace.every((t,i)=>t.frames===t.expected&&(!i||t.ms-trace[i-1].ms<25)),'actual audio-frame bins have no missing coverage');
    return trace;
  };
  await start();
  const playing=await snap();assert.equal(playing.rhythm_circle.audition.pattern,129);assert.ok(playing.rhythm_circle.active_step>=0,'audition drives real world poses even with optional sketch cues off');
  assert.equal(await save(),frozen,'audition itself never writes active draft or practice');assert.equal(playing.rhythm_circle.sketch_gain,-80);assert.equal(playing.music_sample_rms,0,'sketch RMS reports intentional audition duck');assert.ok(playing.rhythm_circle.audition.build_usec<20000,'actual Web mask assembly stays under20ms after pre-start preparation');assert.deepEqual(playing.camera_pose,pose);
  await page.screenshot({path:`artifacts/codex-rhythm-bar-${size.width}x${size.height}-${active?'hosting':'practice'}-${touch?'touch':'mouse'}.png`});
  const sparse=await capture();assert.ok(sparse?.length>50,'actual mixer tap is mandatory, never silently skipped');
  await page.waitForFunction(()=>!window.__tenderloinGodotA11ySnapshot.rhythm_circle.audition.playing);await settle();
  assert.equal((await snap()).music_playing,true);assert.equal(await save(),frozen);assert.ok(Math.abs((await snap()).rhythm_circle.sketch_gain-20*Math.log10((await snap()).music_volume))<.001,'real browser natural end restores current sketch gain');
  let dense=null;
  if(sparse){
    await setMask(255);const denseSave=await save();await start();dense=await capture();await page.waitForFunction(()=>!window.__tenderloinGodotA11ySnapshot.rhythm_circle.audition.playing);assert.equal(await save(),denseSave);
    const stats=trace=>{let last=-1000,bursts=0,run=0,longest=0,previous=0;for(const t of trace){if(t.rms>.003){if(t.ms-last>160)bursts++;last=t.ms;run=0;}else{run+=t.ms-previous;longest=Math.max(longest,run);}previous=t.ms;}return {bursts,longest,peak:Math.max(...trace.map(t=>t.rms))};};
    const a=stats(sparse),b=stats(dense);
    await writeFile(`artifacts/rhythm-bar-output-${size.width}x${size.height}-${active?'hosting':'practice'}-${touch?'touch':'mouse'}.json`,JSON.stringify({sparse,dense,sparseStats:a,denseStats:b},null,2));
    assert.ok(a.peak>.005&&b.peak>.005,'real mixer output has nonzero original drum PCM');assert.ok(a.longest>1300&&b.longest<650,'actual sparse rests are quiet while dense pattern has recurring strikes');assert.ok(b.bursts>=5&&b.bursts>a.bursts,'real output changes with the eight-pad pattern, not a fixed music RMS field');
  }
  await setMask(129);await start();await page.keyboard.press('Space');await page.waitForFunction(()=>!window.__tenderloinGodotA11ySnapshot.rhythm_circle.audition.playing,null,{timeout:800});await settle();
  await start();await tap((await snap()).rhythm_circle.pads[1]);assert.ok(!(await snap()).rhythm_circle.audition.playing,'real edit stops the frozen bar');
  await start();await tap((await snap()).rhythm_circle.options[1]);assert.ok(!(await snap()).rhythm_circle.audition.playing,'actual MusicOff stops bar immediately');
  const n=(await snap()).rhythm_circle.audition.starts;await tap((await snap()).rhythm_circle.options[6]);assert.equal((await snap()).rhythm_circle.audition.starts,n);assert.match((await snap()).rhythm_circle.message,/off or muted/);
  await tap((await snap()).rhythm_circle.options[1]);assert.ok(!(await snap()).rhythm_circle.audition.playing,'MusicOn never resumes optional audition');
  await start();await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await page.waitForFunction(()=>!window.__tenderloinGodotA11ySnapshot.rhythm_circle.audition.playing,null,{timeout:800});await settle();
  assert.equal((await snap()).rhythm_circle.audition_accessibility_name,'Play one bar of this rhythm');assert.match((await snap()).rhythm_circle.message,/Bar stopped/);
  await start();await page.evaluate(()=>{window.dispatchEvent(new Event('pagehide'));window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});await page.waitForFunction(()=>!window.__tenderloinGodotA11ySnapshot.rhythm_circle.audition.playing,null,{timeout:800});await settle();
  assert.match((await snap()).rhythm_circle.message,/Bar stopped/,'coalesced suspend/resume cannot lose stop intent');
  await setMask(0);const zero=(await snap()).rhythm_circle.audition.starts;await tap((await snap()).rhythm_circle.options[6]);assert.equal((await snap()).rhythm_circle.audition.starts,zero);assert.match((await snap()).rhythm_circle.message,/All rests/);
  // Actual Back and Escape interrupt well before a finite bar could finish by itself.
  for(const escape of [false,true]){
    await setMask(129);await start();
    if(escape)await page.keyboard.press('Escape');else await tap((await snap()).rhythm_circle.options[5]);
    await page.waitForFunction(()=>{const c=window.__tenderloinGodotA11ySnapshot.rhythm_circle;return !c.visible&&!c.audition.playing;},null,{timeout:800});
    await page.keyboard.press('F3');await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.rhythm_circle.visible);await settle();assert.ok(!(await snap()).rhythm_circle.audition.playing,'reentry never resumes optional audition');await tap((await snap()).rhythm_circle.options[2]);
  }
  await setMask(initial);if(!wasMusic)await tap((await snap()).rhythm_circle.options[1]);
  rhythmAuditionChecks.push({...size,touch,active,outputObserved:!!sparse,buildUsec:(await snap()).rhythm_circle.audition.build_usec,starts:(await snap()).rhythm_circle.audition.starts});
}

async function verifyRhythmCircle(page,touch,size,active=false,completeListening=false) {
  const snap=()=>page.evaluate(()=>window.__tenderloinGodotA11ySnapshot);
  const save=()=>page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1'));
  const settle=async()=>{const f=(await snap()).ui_frame;await page.waitForFunction(f=>window.__tenderloinGodotA11ySnapshot.ui_frame>f+3&&!window.__tenderloinGodotA11ySnapshot.rhythm_circle.layout_pending&&!window.__tenderloinGodotA11ySnapshot.layout_refit_pending,f);};
  async function tap(b){b=await revealPhoneControl(page,b,tap);
    const s=await snap(),c=await page.locator('#canvas').boundingBox(),w=s.rhythm_circle;
    assert.ok(b.visible&&b.width>=44&&b.height>=44,'actual rhythm44px target');
    const same=x=>Math.abs(x.x-b.x)<.1&&Math.abs(x.y-b.y)<.1,pi=w.visible?w.pads.findIndex(same):-1,oi=w.visible?w.options.findIndex(same):-1;
    const expected=pi>=0?['pattern',w.pattern^(1<<pi)]:!w.visible?['visible',true]:oi===0?['pattern',0]:oi===1?['music',!s.music_playing]:oi===2?['owns_view',true]:oi===3&&!w.practice?['visible',false]:oi===4?['step_cues',!w.step_cues]:oi===5?['visible',false]:null;
    const x=c.x+(b.x+b.width/2)*c.width/s.viewport_width,y=c.y+(b.y+b.height/2)*c.height/s.viewport_height;if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);
    if(expected)await page.waitForFunction(([key,value])=>{const s=window.__tenderloinGodotA11ySnapshot;return (key==='music'?s.music_playing:s.rhythm_circle[key])===value;},expected);
    await settle();
  }
  const within=(r,x,y)=>x>=r.x&&y>=r.y&&x<=r.x+r.width&&y<=r.y+r.height;
  await page.setViewportSize(size);await settle();
  if((await snap()).story_detail.panel.visible){await page.keyboard.press('Escape');await settle();}
  if(!(await snap()).block_hub_actions.some(b=>b.visible)){if((await snap()).block_panel_control.visible){await page.keyboard.press('KeyG');await settle();}await page.keyboard.press('KeyG');await settle();}
  const beforeSave=await save(),before=JSON.parse(beforeSave),pose=(await snap()).camera_pose,zoom=(await snap()).camera_view_size,followed=(await snap()).following_player,ground=(await snap()).player_grounding;
  await tap((await snap()).rhythm_circle.entry);
  let s=await snap(),w=s.rhythm_circle;
  assert.ok(w.visible&&w.practice===!active,'visible entry reaches active editing or labelled late practice');assert.deepEqual(s.camera_pose,pose,'entry leaves manual view until explicit View Circle');
  assert.equal(s.camera_view_size,zoom);
  assert.ok(s.block_panel_control.x>=0&&s.block_panel_control.x+s.block_panel_control.width<=s.viewport_width+1,'new hub entry does not widen the panel off-screen');
  await tap(w.options[2]);s=await snap();w=s.rhythm_circle;
  assert.ok(w.owns_view&&w.world_visible&&w.subjects.length===4&&w.lamps.length===8);
  assert.ok(w.scene.height>=120&&w.scene.width>=240,'world remains useful around the instrument controls');
  for(const subject of w.subjects){assert.ok(within(w.scene,subject.x,subject.y)&&within(w.scene,subject.head_x,subject.head_y),`${subject.name} is actually projected in the unobscured world`);}
  for(const b of [...w.pads,...w.options])assert.ok(b.visible&&b.height>=44&&b.width>=44&&b.x>=0&&b.y>=0&&b.x+b.width<=s.viewport_width+1&&b.y+b.height<=s.viewport_height+1);
  const pixelAt=async(lamp)=>{const pixels=screenshotPixels(await page.screenshot()),c=await page.locator('#canvas').boundingBox(),ss=await snap();return pixels.pixel(c.x+lamp.x*c.width/ss.viewport_width,c.y+lamp.y*c.height/ss.viewport_height);};
  await verifyRhythmAudition(page,touch,size,tap,snap,save,settle,active);
  s=await snap();w=s.rhythm_circle;
  const initial=w.pattern,firstLamp={...w.lamps[0]},beforePixel=await pixelAt(firstLamp);
  await tap(w.pads[0]);s=await snap();w=s.rhythm_circle;
  assert.equal(w.pattern,initial^1);assert.equal(w.lamps[0].hit,!(initial&1));
  const afterPixel=await pixelAt(w.lamps[0]);
  assert.ok(afterPixel.reduce((n,v,i)=>n+Math.abs(v-beforePixel[i]),0)>45,'specific actual3D lantern pixels change after real pad input');
  await tap(w.pads[0]);
  for(let i=1;i<8;i++){const original=(await snap()).rhythm_circle.pattern;await tap((await snap()).rhythm_circle.pads[i]);assert.equal((await snap()).rhythm_circle.pattern,original^(1<<i));await tap((await snap()).rhythm_circle.pads[i]);}
  // A real Down-arrow focus move and Space activate the pad below in the4-column grid.
  await tap((await snap()).rhythm_circle.pads[0]);const keyboardPattern=(await snap()).rhythm_circle.pattern;await page.keyboard.press('ArrowDown');await page.keyboard.press('Space');await page.waitForFunction(p=>window.__tenderloinGodotA11ySnapshot.rhythm_circle.pattern===(p^(1<<4)),keyboardPattern);await settle();
  await tap((await snap()).rhythm_circle.pads[4]);await tap((await snap()).rhythm_circle.pads[0]);
  await page.keyboard.down('KeyW');await page.waitForTimeout(120);await page.keyboard.up('KeyW');assert.equal((await snap()).player_grounding.x,ground.x);assert.equal((await snap()).player_grounding.z,ground.z);
  await tap((await snap()).rhythm_circle.options[0]);assert.equal((await snap()).rhythm_circle.pattern,0);
  // Listening0 remains equally valid; restore the original for the main parity progression.
  if(!completeListening)for(let i=0;i<8;i++)if(initial&(1<<i))await tap((await snap()).rhythm_circle.pads[i]);
  const beforeMusic=(await snap()).music_playing;
  if(!beforeMusic)await tap((await snap()).rhythm_circle.options[1]);
  await tap((await snap()).rhythm_circle.options[4]);
  if((await snap()).rhythm_circle.pattern)await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.rhythm_circle.active_step>=0);
  await tap((await snap()).rhythm_circle.options[1]);assert.equal((await snap()).rhythm_circle.active_step,-1,'MusicOff gives static quiet poses');
  const staticLamp=(await snap()).rhythm_circle.lamps;await page.waitForTimeout(180);assert.deepEqual((await snap()).rhythm_circle.lamps,staticLamp,'quiet lantern geometry is static');
  if(!active&&size.width===390){
    await page.evaluate(()=>{
      const count=2205,bytes=new Uint8Array(44+count*2),view=new DataView(bytes.buffer),put=(p,t)=>[...t].forEach((c,i)=>bytes[p+i]=c.charCodeAt(0));
      put(0,'RIFF');view.setUint32(4,bytes.length-8,true);put(8,'WAVE');put(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,22050,true);view.setUint32(28,44100,true);view.setUint16(32,2,true);view.setUint16(34,16,true);put(36,'data');view.setUint32(40,count*2,true);for(let i=0;i<count;i++)view.setInt16(44+i*2,Math.round(Math.sin(i*2*Math.PI*330/22050)*9000),true);
      window.__tenderloinQueueLocalAudioBytes('rhythm-fallback-test.wav',bytes,'');
    });
    await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.music_mode==='local'&&window.__tenderloinGodotA11ySnapshot.music_playing);await settle();assert.equal((await snap()).rhythm_circle.active_step,-1,'actual local WAV bridge keeps rhythm cues static');await tap((await snap()).rhythm_circle.options[6]);assert.ok(!(await snap()).rhythm_circle.audition.playing);assert.match((await snap()).rhythm_circle.message,/Local music/);await tap((await snap()).rhythm_circle.options[1]);
  }
  if(beforeMusic)await tap((await snap()).rhythm_circle.options[1]);
  await page.screenshot({path:`artifacts/codex-rhythm-circle-${size.width}x${size.height}-${touch?'touch':'mouse'}-${active?'active':'practice'}.png`});
  await writeFile(`artifacts/codex-rhythm-circle-${size.width}x${size.height}-${touch?'touch':'mouse'}-${active?'active':'practice'}.json`,JSON.stringify(await snap(),null,2));
  if(active){
    const count=before.hosting.results.length;await tap((await snap()).rhythm_circle.options[3]);assert.ok(!(await snap()).rhythm_circle.visible);const after=JSON.parse(await save());assert.equal(after.hosting.results.length,count+1);assert.equal(after.hosting.results.at(-1).value,completeListening?0:initial);if(count===3)assert.match((await snap()).announcement,/Second Afternoon Complete/,'beats-last keeps its earned completion announcement');
  }else{
    if(touch){const rr=(await snap()).rhythm_circle.scene,c=await page.locator('#canvas').boundingBox(),ss=await snap(),x=c.x+(rr.x+rr.width*.5)*c.width/ss.viewport_width,y=c.y+(rr.y+rr.height*.7)*c.height/ss.viewport_height,cdp=await page.context().newCDPSession(page),pose=(await snap()).camera_pose;
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+2,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();await settle();assert.ok((await snap()).rhythm_circle.owns_view);assert.deepEqual((await snap()).camera_pose,pose,'actual2px finger jitter retains camera/Back ownership');
    }
    const rotated=size.width>=520?{width:390,height:667}:{width:520,height:360};
    await page.setViewportSize(rotated);await settle();let rotatedView=(await snap()).rhythm_circle;assert.ok(rotatedView.visible&&rotatedView.pads.every(b=>b.visible&&b.width>=44&&b.height>=44));
    await page.setViewportSize(size);await settle();
    assert.equal(await save(),beforeSave,'all practice/music/reading/rotation controls leave exact saved bytes untouched');
    await tap((await snap()).rhythm_circle.options[3]);assert.equal((await snap()).rhythm_circle.pattern,initial,'Reset restores saved result, not a persisted new result');
    await page.keyboard.press('Escape');await settle();const returned=await snap();assert.ok(!returned.rhythm_circle.visible);assert.equal(returned.camera_view_size,zoom);
    if(followed){
      assert.equal(returned.following_player,true);assert.equal(returned.camera_pose.yaw,pose.yaw);assert.equal(returned.camera_pose.pitch,pose.pitch);
      const b=returned.overlays.player,r=returned.play_area;assert.ok(b.x>=r.x-1&&b.y>=r.y-1&&b.x+b.width<=r.x+r.width+1&&b.y+b.height<=r.y+r.height+1,'after round-trip rotation Back refits the full followed body in the restored hub without changing zoom or heading');
    }else assert.deepEqual(returned.camera_pose,pose,'Back restores the exact prior manually owned camera after round-trip rotation');
    assert.equal(await save(),beforeSave);assert.deepEqual(JSON.parse(await save()).epilogue.photo,before.epilogue.photo);
    await page.keyboard.press('F3');await settle();assert.ok((await snap()).rhythm_circle.visible,'late players can return through keyboard as well');await tap((await snap()).rhythm_circle.options[2]);
    const rr=(await snap()).rhythm_circle.scene,c=await page.locator('#canvas').boundingBox(),ss=await snap(),x=c.x+(rr.x+rr.width*.5)*c.width/ss.viewport_width,y=c.y+(rr.y+rr.height*.75)*c.height/ss.viewport_height;
    if(touch){const session=await page.context().newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+20,y:y+8}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();}else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+20,y+8,{steps:5});await page.mouse.up();}
    await settle();const manual=(await snap()).camera_pose;assert.equal((await snap()).rhythm_circle.owns_view,false,'real scene inspection owns camera');await tap((await snap()).rhythm_circle.options[5]);assert.deepEqual((await snap()).camera_pose,manual,'Back respects manual scene pan');assert.equal(await save(),beforeSave);
    await page.keyboard.press('KeyF');await settle();await page.keyboard.press('KeyG');await settle();assert.ok((await snap()).block_panel_control.visible);await page.keyboard.press('F3');await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.rhythm_circle.visible);await settle();await tap((await snap()).rhythm_circle.options[2]);
    await page.setViewportSize(rotated);await settle();await tap((await snap()).rhythm_circle.options[5]);await settle();
    const restored=await snap(),body=restored.overlays.player,r=restored.play_area;assert.ok(restored.block_panel_control.visible,'rotation restores the actually open hub');
    assert.ok(body.x>=r.x-1&&body.y>=r.y-1&&body.x+body.width<=r.x+r.width+1&&body.y+body.height<=r.y+r.height+1,'actual open rotation Back fits the full followed player above the restored hub');
    assert.ok(restored.block_panel_control.x>=0&&restored.block_panel_control.x+restored.block_panel_control.width<=restored.viewport_width+1);
    await page.setViewportSize(size);await settle();assert.equal(await save(),beforeSave);
  }
  if(!active&&[1100,390,320].includes(size.width)){
    await page.keyboard.press('F3');await settle();await tap((await snap()).rhythm_circle.pads[7]);assert.notEqual((await snap()).rhythm_circle.pattern,initial);if((await snap()).music_playing&&(await snap()).music_mode==='sketch'){await tap((await snap()).rhythm_circle.options[6]);await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.rhythm_circle.audition.playing);}
    await page.reload();await page.locator('#status').waitFor({state:'hidden',timeout:60000});await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.startup_pending&&!window.__tenderloinGodotA11ySnapshot.layout_refit_pending);
    assert.ok(!(await snap()).rhythm_circle.visible&&!(await snap()).rhythm_circle.audition.playing,'reload never resumes an optional bar');assert.equal((await snap()).rhythm_circle.pattern,initial,'reload discards ephemeral practice');assert.equal(await save(),beforeSave,'practice reload leaves exact copied result and photo');
  }
  rhythmCircleChecks.push({...size,touch,active,completeListening,layout:before.gathering_layout,photo:before.epilogue.photo.status,beforePixel,afterPixel,scene:w.scene});
}

const muralStoryChecks = [];
const livingMuralChecks = [];
function assertArtCameraStable(before,after,message){
  const a=before.camera_pose,b=after.camera_pose,drift=Math.hypot(a.target_x-b.target_x,a.target_y-b.target_y,a.target_z-b.target_z);
  // Activity refitting projects Float32 world/screen coordinates even when centered.
  // 0.1mm is far below one rendered pixel; heading, zoom and camera mode stay exact.
  assert.ok(drift<=0.0001,`${message}: translation drift ${drift}m`);
  assert.equal(b.yaw,a.yaw);assert.equal(b.pitch,a.pitch);assert.equal(after.camera_view_size,before.camera_view_size);
  for(const key of ['following_player','in_overview','in_wide_overview'])assert.equal(after[key],before[key],`${message}: ${key}`);
  return drift;
}
async function verifyStoryStreet(page,context,touch,tap,snap,settle,asymmetric=false,tag=''){
  // Real navigation, zoom and drag expose the portable board; metadata only locates it.
  await page.keyboard.press('KeyM');await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.mural_detail.panel.visible&&!window.__tenderloinGodotA11ySnapshot.player_grounding.path_active,null,{timeout:35000});await settle();
  if(asymmetric){
    await page.keyboard.press('F2');await settle();await tap((await snap()).mural_workshop.stories_entry);await tap((await snap()).mural_workshop.stories.buttons[6]);
    assert.deepEqual(JSON.parse(await page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1'))).mural_scenes,{left:'sharing'});
    await tap((await snap()).mural_workshop.stories.buttons[9]);await page.keyboard.press('Escape');await settle();
  }
  await tap((await snap()).mural_detail.buttons.at(-1));await tap((await snap()).walking_controls[1]);await tap((await snap()).walking_controls[2]);
  await page.keyboard.press('KeyM');await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.mural_detail.panel.visible&&!window.__tenderloinGodotA11ySnapshot.player_grounding.path_active,null,{timeout:35000});await settle();await tap((await snap()).mural_detail.buttons.at(-1));
  // Step aside with real walking input so the enlarged avatar cannot cover the art.
  {const p=(await snap()).player_grounding;await page.keyboard.down('KeyA');try{await page.waitForFunction(p=>{const s=window.__tenderloinGodotA11ySnapshot.player_grounding;return Math.hypot(s.x-p.x,s.z-p.z)>3;},p,{timeout:10000});}finally{await page.keyboard.up('KeyA');}await settle();}
  // The unchanged overhead wire can cover the tiny musician's face in short views.
  // Hold real input to the existing minimum pitch; an intermediate polling cutoff
  // can overshoot by different frames and leave the tiny face behind that wire.
  // Keep geography, camera limits and all original pixel/prop checks unchanged.
  if(tag==='-living'&&(await snap()).viewport_height<560){
    await page.keyboard.down('Shift');await page.keyboard.down('ArrowDown');
    try{await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.camera_pose.pitch===.55);}finally{await page.keyboard.up('ArrowDown');await page.keyboard.up('Shift');}await settle();
  }
  for(let i=0;i<5;i++)await tap((await snap()).walking_controls.find(b=>b.text.includes('Zoom')&&b.text.includes('+')));
  let s=await snap(),q=s.mural_scenes_world.corners,r=s.play_area,c=await page.locator('#canvas').boundingBox(),cx=q.reduce((a,p)=>a+p.x,0)/4,cy=q.reduce((a,p)=>a+p.y,0)/4;
  const x=c.x+(r.x+r.width*.5)*c.width/s.viewport_width,y=c.y+(r.y+r.height*.25)*c.height/s.viewport_height,dx=(r.x+r.width*.55-cx)*c.width/s.viewport_width,dy=(r.y+r.height*.5-cy)*c.height/s.viewport_height;
  if(touch){const d=await context.newCDPSession(page);await d.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});for(let i=1;i<=8;i++)await d.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/8,y:y+dy*i/8,id:1}]});await d.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await d.detach();}
  else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:8});await page.mouse.up();}
  await settle();s=await snap();q=s.mural_scenes_world.corners;
  for(const p of q)assert.ok(p.x>=s.play_area.x-1&&p.y>=s.play_area.y-1&&p.x<=s.play_area.x+s.play_area.width+1&&p.y<=s.play_area.y+s.play_area.height+1,'actual full scene layer is uncovered in play area');
  const paper={x:Math.min(...q.map(p=>p.x))-4,y:Math.min(...q.map(p=>p.y))-4,width:Math.max(...q.map(p=>p.x))-Math.min(...q.map(p=>p.x))+8,height:Math.max(...q.map(p=>p.y))-Math.min(...q.map(p=>p.y))+8},guide=s.overlays.guide_label;
  assert.ok(!guide.visible||guide.x+guide.width<=paper.x||paper.x+paper.width<=guide.x||guide.y+guide.height<=paper.y||paper.y+paper.height<=guide.y,'actual outlined objective stays off deliberately inspected painted people');
  const img=screenshotPixels(await page.screenshot()),bins=[{ink:0,paper:0,skin:0},{ink:0,paper:0,skin:0}];
  for(let u=.03;u<.97;u+=.007)for(let v=.03;v<.97;v+=.009){const x=(q[0].x*(1-u)+q[1].x*u)*(1-v)+(q[2].x*(1-u)+q[3].x*u)*v,y=(q[0].y*(1-u)+q[1].y*u)*(1-v)+(q[2].y*(1-u)+q[3].y*u)*v,rgb=img.pixel(c.x+x*c.width/s.viewport_width,c.y+y*c.height/s.viewport_height),b=bins[u<.5?0:1];if(rgb.reduce((a,v)=>a+v,0)<480)b.ink++;if(rgb[0]>215&&rgb[1]>190&&rgb[2]>150)b.paper++;if(v>.1&&v<.8&&[[200,141,108],[145,111,86]].some(p=>p.every((v,i)=>Math.abs(v-rgb[i])<19)))b.skin++;}
  // Existing overhead street wires cross the blank half too; skin and mostly-paper
  // distinguish the person from those unchanged dark lines without hiding geometry.
  if(asymmetric)assert.ok(bins[0].ink>=20&&bins[0].skin>=3&&bins[1].skin<=3&&bins[1].paper>bins[0].paper&&bins[1].paper>2*bins[1].ink,`one actual left scene and blank right prove world UV handedness: ${JSON.stringify(bins)}`);
  else assert.ok(bins.every(b=>b.ink>=20&&b.paper>=100&&b.skin>=3),`both world halves visibly render original people skin/ink on paper, not metadata or old glyphs alone: ${JSON.stringify(bins)}`);
  const propSamples=[];
  if(tag==='-living')for(const [u0,u1,v0,v1] of [[.16,.30,.43,.70],[.66,.81,.43,.79]]){
    let warm=0;for(let i=0;i<30;i++)for(let j=0;j<30;j++){
      const u=u0+(u1-u0)*i/29,v=v0+(v1-v0)*j/29,x=(q[0].x*(1-u)+q[1].x*u)*(1-v)+(q[2].x*(1-u)+q[3].x*u)*v,y=(q[0].y*(1-u)+q[1].y*u)*(1-v)+(q[2].y*(1-u)+q[3].y*u)*v;
      const [r,g,b]=img.pixel(c.x+x*c.width/s.viewport_width,c.y+y*c.height/s.viewport_height);
      // Painted wood/guitar body is warm; the paper and unchanged grey wires are not.
      if(r>140&&r<240&&g<196&&r-g>18&&g-b>18)warm++;
    }propSamples.push(warm);assert.ok(warm>=8,'central instrument/planter paint remains visible through actual world overlays');
  }
  await page.screenshot({path:`artifacts/codex-mural-stories-world-${s.viewport_width}x${s.viewport_height}-${touch?'finger':'mouse'}${asymmetric?'-left-only':''}${tag}.png`});
  if(asymmetric){
    await page.keyboard.press('KeyM');await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.mural_detail.panel.visible&&!window.__tenderloinGodotA11ySnapshot.player_grounding.path_active,null,{timeout:35000});await settle();
    await page.keyboard.press('F2');await settle();await tap((await snap()).mural_workshop.stories_entry);await tap((await snap()).mural_workshop.stories.buttons[2]);await tap((await snap()).mural_workshop.stories.buttons[4]);await tap((await snap()).mural_workshop.stories.buttons[9]);await page.keyboard.press('Escape');await settle();await tap((await snap()).mural_detail.buttons.at(-1));
  }
  return {bins,corners:q,asymmetric,propSamples};
}
async function verifyLivingMural(page,context,touch,size,verifyResidents=false){
  const snap=()=>page.evaluate(()=>window.__tenderloinGodotA11ySnapshot),save=()=>page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1'));
  const settle=async()=>{const f=(await snap()).ui_frame;await page.waitForFunction(f=>{const s=window.__tenderloinGodotA11ySnapshot;return s.ui_frame>f+4&&!s.mural_workshop.layout_pending&&!s.mural_workshop.stories?.layout_pending&&!s.layout_refit_pending&&!s.compact_panel_layout_pending;},f);};
  const fits=(a,b)=>b.x>=a.x-1&&b.y>=a.y-1&&b.x+b.width<=a.x+a.width+1&&b.y+b.height<=a.y+a.height+1;
  async function tap(b){b=await revealPhoneControl(page,b,tap);const s=await snap(),c=await page.locator('#canvas').boundingBox();assert.ok(b?.visible&&b.width>=44&&b.height>=44,'new art action uses a visible44px target');const x=c.x+(b.x+b.width/2)*c.width/s.viewport_width,y=c.y+(b.y+b.height/2)*c.height/s.viewport_height;if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);await settle();}
  async function role(id){await tap((await snap()).mural_workshop.stories.buttons.find(b=>b.role===id));}
  async function open(){await page.keyboard.press('KeyM');await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.mural_detail.panel.visible&&!window.__tenderloinGodotA11ySnapshot.player_grounding.path_active,null,{timeout:35000});await settle();await page.keyboard.press('F2');await settle();await tap((await snap()).mural_workshop.stories_entry);}
  async function pixels(){const s=await snap(),r=s.mural_workshop.stories.paper,c=await page.locator('#canvas').boundingBox(),p=screenshotPixels(await page.screenshot()),out=[];for(let y=.08;y<.92;y+=.025)for(let x=.025;x<.475;x+=.025)out.push({x,y,rgb:p.pixel(c.x+(r.x+r.width*x)*c.width/s.viewport_width,c.y+(r.y+r.height*y)*c.height/s.viewport_height)});return out;}
  const difference=(a,b,prop=false)=>a.filter((p,i)=>(!prop||(p.x>.16&&p.x<.33&&p.y>.42&&p.y<.79))&&p.rgb.some((v,k)=>Math.abs(v-b[i].rgb[k])>30)).length;
  await page.keyboard.press('KeyF');await open();let s=await snap(),art=s.mural_workshop.stories;
  const initial=JSON.parse(await save()),legacy=await page.evaluate(()=>localStorage.getItem('tenderloin-redux.save.v1')),music=s.music_playing,cameraBefore=s,position=s.player_grounding,paper=art.paper;
  const invariant=o=>{const c=structuredClone(o);delete c.mural_scenes;delete c.save_seq;return c;};
  const prior=await save();await role('page');assert.equal(await save(),prior,'page browsing does not save');
  art=(await snap()).mural_workshop.stories;assert.equal(art.page,1);assert.deepEqual(art.buttons.filter(b=>b.visible&&b.role.startsWith('choice:')).map(b=>b.text),['Making Music','Growing Together']);
  assert.ok(art.paper.width>=paper.width-1&&art.paper.height>=paper.height-1,'new page preserves primary painting size');
  for(const b of art.buttons.filter(b=>b.visible))assert.ok(b.text_fits&&b.width>=44&&b.height>=44&&fits(art.panel,b),`complete new page control fits: ${b.role}`);
  for(const id of ['lift:left','lift:right'])if(!(await snap()).mural_workshop.stories.buttons.find(b=>b.role===id).disabled)await role(id);
  const blank=await pixels(),images=[],changes=[],props=[];
  for(const id of ['music','garden']){
    const before=await save();await role('choice:'+id);assert.equal(await save(),before,'choosing a new illustration does not save');await role('target:left');
    const pic=await pixels();images.push(pic);changes.push(difference(blank,pic));props.push(difference(blank,pic,true));assert.ok(changes.at(-1)>=40&&props.at(-1)>=8,`${id} makes substantial figure and central instrument/planter pixels`);
    const same=await save();await role('target:left');assert.equal(await save(),same,'repainting same new scene is a non-write');
    await page.screenshot({path:`artifacts/living-mural-${id}-${size.width}x${size.height}-${touch?'finger':'mouse'}.png`});
  }
  assert.ok(difference(images[0],images[1])>=40,'musician and gardeners have distinct rendered silhouettes');
  await role('choice:music');await role('target:left');await role('choice:garden');await role('target:right');
  // Explicit focus links must skip the hidden third choice on this page.
  await role('choice:garden');await page.keyboard.press('ArrowRight');await page.keyboard.press('Space');await settle();assert.deepEqual(JSON.parse(await save()).mural_scenes,{left:'garden'});
  await page.keyboard.press('ArrowRight');await page.keyboard.press('Space');await settle();assert.deepEqual(JSON.parse(await save()).mural_scenes,{right:'garden'});
  await role('choice:music');await role('target:left');
  const final=JSON.parse(await save());assert.deepEqual(final.mural_scenes,{left:'music',right:'garden'});assert.deepEqual(invariant(final),invariant(initial),'only optional current art and sequence change');assert.ok(Buffer.byteLength(await save())<=4096);
  assert.match((await snap()).mural_workshop.stories.reader.text,/silent illustration/,'quiet explanation survives actual painting');
  await page.screenshot({path:`artifacts/living-mural-composed-${size.width}x${size.height}-${touch?'finger':'mouse'}.png`});
  s=await snap();assert.equal(s.music_playing,music);assertArtCameraStable(cameraBefore,s,'new scenes preserve camera intent');assert.equal(s.player_grounding.x,position.x);assert.equal(s.player_grounding.z,position.z);
  await page.setViewportSize(size.width<600?{width:800,height:480}:{width:320,height:568});await settle();assert.equal((await snap()).mural_workshop.stories.page,1);await page.setViewportSize(size);await settle();
  await writeFile(`artifacts/living-mural-${size.width}x${size.height}-${touch?'finger':'mouse'}.json`,JSON.stringify({snapshot:await snap(),changes,props,save:final},null,2));
  // Real reload proves enum compatibility; transient page/brush reset, artwork remains.
  await page.reload();await page.locator('#status').waitFor({state:'hidden',timeout:60000});await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.startup_pending&&!window.__tenderloinGodotA11ySnapshot.layout_refit_pending);await page.keyboard.press('Escape');await settle();
  assert.deepEqual(JSON.parse(await save()).mural_scenes,{left:'music',right:'garden'});assert.deepEqual(invariant(JSON.parse(await save())),invariant(initial));
  await open();assert.equal((await snap()).mural_workshop.stories.page,0,'reopening starts on the discoverable original page');await role('page');assert.match((await snap()).mural_workshop.stories.reader.text,/silent illustration/);await role('back');await page.keyboard.press('Escape');await settle();
  const world=await verifyStoryStreet(page,context,touch,tap,snap,settle,false,'-living');
  const reactions=[];
  if(verifyResidents)for(const [key,phrase] of [['Digit4','painted guitar'],['Digit5','painted planter']]){
    await page.keyboard.press(key);await page.waitForFunction(phrase=>{const s=window.__tenderloinGodotA11ySnapshot;return !s.player_grounding.path_active&&s.conversation_detail.panel.visible&&s.conversation_detail.text.includes(phrase);},phrase,{timeout:35000});await settle();
    const s=await snap(),speech=s.overlays.speech;assert.ok(speech.text.includes(phrase)&&!speech.text.startsWith(key==='Digit4'?'Dez:':'Thanh:')&&!speech.text.includes('"'),'actual new resident speech is parsed without duplicate speaker/quotes');
    if(speech.visible&&!speech.deferred&&!speech.in_info)assert.ok(fits(s.play_area,speech),'long art reaction stays in play space or uses existing complete reader fallback');
    reactions.push(s.conversation_detail.text);await tap(s.conversation_detail.buttons.find(b=>b.visible&&b.id===2));
  }
  assert.equal(await page.evaluate(()=>localStorage.getItem('tenderloin-redux.save.v1')),legacy);
  livingMuralChecks.push({size,touch,changes,props,pairDifference:difference(images[0],images[1]),paper:paper,world,reactions,saveBytes:Buffer.byteLength(await save())});
}
async function verifyMuralStories(page, context, touch, originalSize, requireTakenPhoto = true) {
  const snap=()=>page.evaluate(()=>window.__tenderloinGodotA11ySnapshot),save=()=>page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1'));
  const settle=async()=>{const f=(await snap()).ui_frame;await page.waitForFunction(f=>{const s=window.__tenderloinGodotA11ySnapshot;return s.ui_frame>f+4&&!s.mural_workshop.layout_pending&&!s.layout_refit_pending&&!s.compact_panel_layout_pending;},f);};
  const encloses=(a,b)=>b.x>=a.x-1&&b.y>=a.y-1&&b.x+b.width<=a.x+a.width+1&&b.y+b.height<=a.y+a.height+1;
  async function tap(b){b=await revealPhoneControl(page,b,tap);const s=await snap(),c=await page.locator('#canvas').boundingBox();assert.ok(b?.visible&&b.width>=44&&b.height>=44,'story interaction has an actual visible44px target');const x=c.x+(b.x+b.width/2)*c.width/s.viewport_width,y=c.y+(b.y+b.height/2)*c.height/s.viewport_height;if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);await settle();}
  async function storyButton(i){await tap((await snap()).mural_workshop.stories.buttons[i]);}
  async function paperSample(){const s=await snap(),r=s.mural_workshop.stories.paper,c=await page.locator('#canvas').boundingBox(),p=screenshotPixels(await page.screenshot()),samples=[];for(let y=.08;y<.92;y+=.025)for(let x=.025;x<.975;x+=.025)samples.push(p.pixel(c.x+(r.x+r.width*x)*c.width/s.viewport_width,c.y+(r.y+r.height*y)*c.height/s.viewport_height));return samples;}
  const differences=(a,b)=>a.filter((p,i)=>p.some((v,k)=>Math.abs(v-b[i][k])>30)).length;
  const sizes=originalSize.width===390?[originalSize]:[originalSize,{width:520,height:360},{width:559,height:360}];
  for(const size of sizes){
    await page.setViewportSize(size);await page.keyboard.press('KeyF');await page.keyboard.press('KeyM');
    await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.mural_detail.panel.visible&&!window.__tenderloinGodotA11ySnapshot.player_grounding.path_active,null,{timeout:35000});await settle();
    let s=await snap();if(s.story_detail.panel.visible){await page.keyboard.press('Escape');await settle();s=await snap();}
    const legacy=await page.evaluate(()=>localStorage.getItem('tenderloin-redux.save.v1'));
    const original=JSON.parse(await save());if(requireTakenPhoto)assert.equal(original.epilogue.photo.status,'taken','story edits preserve a genuinely taken keepsake');
    const photo=JSON.stringify(original.epilogue.photo),oldMarks=JSON.stringify(original.mural_placements),cameraBefore=s,position=s.player_grounding,music=s.music_playing;
    await page.keyboard.press('F2');await settle();s=await snap();assert.ok(s.mural_workshop.visible);
    await tap(s.mural_workshop.stories_entry);s=await snap();let art=s.mural_workshop.stories;
    assert.ok(art.visible&&art.focus_within&&!s.mural_workshop.panel.visible);
    assert.ok(encloses({x:0,y:0,...size},art.panel),'whole new panel fits actual viewport');
    for(const b of art.buttons)assert.ok(b.visible&&b.width>=44&&b.height>=44&&b.text_fits&&encloses(art.panel,b),`complete story target fits: ${b.text}`);
    assert.deepEqual(art.buttons.slice(0,3).map(b=>b.text),['Cooking Together','Sharing a Bowl','Making Street Art']);
    // Clear prior optional stories using actual lift controls; original marks stay untouched.
    for(const i of [5,6])if(!(await snap()).mural_workshop.stories.buttons[i].disabled)await storyButton(i);
    const blank=await paperSample(),pixelChanges=[];
    for(let i=0;i<3;i++){
      const prior=await save();await storyButton(i);assert.equal(await save(),prior,'choosing an illustration is not a save or reward');
      await storyButton(3);assert.deepEqual(JSON.parse(await save()).mural_scenes,{left:['cooking','sharing','painting'][i]});
      const rendered=await paperSample(),changed=differences(blank,rendered);assert.ok(changed>=40,`${['cook','sharing','artist'][i]} person-and-prop scene makes visible paper pixels`);pixelChanges.push(changed);
      const same=await save();await storyButton(3);assert.equal(await save(),same,'repeated placement is a non-write');
      await page.screenshot({path:`artifacts/codex-mural-story-${i}-${size.width}x${size.height}-${touch?'finger':'mouse'}.png`});
    }
    await storyButton(0);await storyButton(3);await storyButton(2);await storyButton(4);
    assert.deepEqual(JSON.parse(await save()).mural_scenes,{left:'cooking',right:'painting'});
    // The focused right half is really activated by keyboard, moving the selected scene.
    await storyButton(0);await storyButton(3);await page.keyboard.press('ArrowRight');await page.keyboard.press('Space');await settle();
    assert.deepEqual(JSON.parse(await save()).mural_scenes,{right:'cooking'},'real arrow/Space moves rather than duplicates the scene');
    await storyButton(1);await storyButton(3);await storyButton(2);await storyButton(4);
    assert.deepEqual(JSON.parse(await save()).mural_scenes,{left:'sharing',right:'painting'});
    const beforePalette=await paperSample();await storyButton(7);assert.ok(differences(beforePalette,await paperSample())>=30,'actual palette recolors scene illustration');
    const beforeMusic=JSON.parse(await save()).save_seq;await storyButton(8);assert.notEqual((await snap()).music_playing,music);await storyButton(8);assert.equal((await snap()).music_playing,music);assert.equal(JSON.parse(await save()).save_seq,beforeMusic,'independent Music does not rewrite art');
    await page.keyboard.down('KeyW');await settle();await page.keyboard.up('KeyW');s=await snap();assert.equal(s.player_grounding.x,position.x);assert.equal(s.player_grounding.z,position.z);const cameraDriftM=assertArtCameraStable(cameraBefore,s,'new editor does not take over camera');
    // Real reader navigation and finger drag reach the complete keepsake explanation.
    const r=s.mural_workshop.stories.reader,rr=r.reader||r;
    // activity_detail_snapshot exposes the reader rectangle as text_rect.
    const rect=r.control;const c=await page.locator('#canvas').boundingBox();
    const x=c.x+(rect.x+rect.width*.5)*c.width/s.viewport_width,y=c.y+(rect.y+rect.height*.5)*c.height/s.viewport_height;
    if(touch){const d=await context.newCDPSession(page);await d.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:y+8,id:1}]});await d.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-18,id:1}]});await d.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await d.detach();}
    else{await page.mouse.move(x,y);await page.mouse.wheel(0,900);}
    await settle();assert.match((await snap()).mural_workshop.stories.reader.text,/earlier keepsake stays as it was/);
    assert.ok((await snap()).mural_workshop.stories.reader.scroll_value>0,'actual finger/wheel input advances the overflowing complete story reader');
    for(let i=0;i<14;i++){await page.keyboard.press('Tab');assert.ok((await snap()).mural_workshop.stories.focus_within,'Tab remains inside the new editor');}
    await page.setViewportSize(size.width<600?{width:800,height:480}:{width:320,height:568});await settle();assert.ok((await snap()).mural_workshop.stories.visible,'open rotation retains scene mode');await page.setViewportSize(size);await settle();
    await storyButton(9);s=await snap();assert.ok(!s.mural_workshop.stories.visible&&s.mural_workshop.panel.visible,'actual Back returns to original18-spot Workshop');assert.equal(s.mural_workshop.cells.length,18);
    await tap(s.mural_workshop.stories_entry);await page.keyboard.press('Escape');await settle();assert.ok(!(await snap()).mural_workshop.stories.visible,'Escape returns one level');await page.keyboard.press('Escape');await settle();assert.ok(!(await snap()).mural_workshop.visible,'second deliberate Escape closes the Workshop');
    const final=JSON.parse(await save());assert.equal(JSON.stringify(final.epilogue.photo),photo);assert.equal(JSON.stringify(final.mural_placements),oldMarks);assert.ok(Buffer.byteLength(JSON.stringify(final))<=4096);
    await page.reload();await page.locator('#status').waitFor({state:'hidden',timeout:60000});await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.startup_pending&&!window.__tenderloinGodotA11ySnapshot.layout_refit_pending);await page.keyboard.press('Escape');await settle();
    assert.deepEqual(JSON.parse(await save()).mural_scenes,{left:'sharing',right:'painting'},'normal reload restores both saved scene anchors');assert.equal(JSON.stringify(JSON.parse(await save()).epilogue.photo),photo);
    const asymmetric=(!requireTakenPhoto&&Object.keys(original.mural_placements).length===0)?await verifyStoryStreet(page,context,touch,tap,snap,settle,true):null;
    const world=await verifyStoryStreet(page,context,touch,tap,snap,settle);
    assert.equal(await page.evaluate(()=>localStorage.getItem('tenderloin-redux.save.v1')),legacy,'scene editing never writes the legacy browser profile');
    muralStoryChecks.push({size,touch,requireTakenPhoto,pixelChanges,asymmetric,world,cameraDriftM,saveBytes:Buffer.byteLength(await save())});
    await verifyLivingMural(page,context,touch,size,requireTakenPhoto&&[1100,390,320].includes(size.width));
  }
  await page.setViewportSize(originalSize);
}

async function verifyMuralWorkshop(page, context, touch, originalSize, requireTakenPhoto = true) {
  const snap = () => page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
  const save = () => page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1'));
  const settle = async () => {
    const s = await snap();
    await page.waitForFunction(f => window.__tenderloinGodotA11ySnapshot.ui_frame > f + 3 && !window.__tenderloinGodotA11ySnapshot.mural_workshop.layout_pending && !window.__tenderloinGodotA11ySnapshot.compact_panel_layout_pending && !window.__tenderloinGodotA11ySnapshot.layout_refit_pending, s.ui_frame);
  };
  const encloses = (a,b) => b.x >= a.x - 1 && b.y >= a.y - 1 && b.x+b.width <= a.x+a.width+1 && b.y+b.height <= a.y+a.height+1;
  async function tap(b) {b=await revealPhoneControl(page,b,tap);
    const s = await snap(), c = await page.locator('#canvas').boundingBox();
    assert.ok(b.visible && b.width >= 44 && b.height >= 44, 'workshop input uses a visible44px target');
    const x = c.x+(b.x+b.width/2)*c.width/s.viewport_width, y = c.y+(b.y+b.height/2)*c.height/s.viewport_height;
    if (touch) await page.touchscreen.tap(x,y); else await page.mouse.click(x,y);
    await settle();
  }
  const sizes = originalSize.width === 390 ? [originalSize] : [originalSize,{width:520,height:360},{width:559,height:360}];
  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.keyboard.press('KeyF');
    await page.keyboard.press('KeyE');
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot.mural_detail.panel.visible && !window.__tenderloinGodotA11ySnapshot.player_grounding.path_active, null, {timeout:35000});
    await settle();
    let s = await snap();
    if (s.story_detail.panel.visible) { await page.keyboard.press('Escape'); await settle(); s = await snap(); }
    if(size.width===520){
      const a=s.play_area,c=await page.locator('#canvas').boundingBox();
      const x=c.x+(a.x+a.width/2)*c.width/size.width,y=c.y+(a.y+a.height*0.8)*c.height/size.height;
      if(touch){const finger=await context.newCDPSession(page);await finger.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await finger.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+10,y:y+4,id:1}]});await finger.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await finger.detach();}
      else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+10,y+4,{steps:3});await page.mouse.up();}
      await settle();s=await snap();assert.ok(!s.following_player,'real scene drag owns the camera before composing');
    }
    if(size.width===520){await tap(s.info_control);s=await snap();assert.ok(s.header_details_expanded,'actual Info is expanded before the hidden-reward test');}
    const before = JSON.parse(await save()), photo = before.epilogue.photo;
    if (requireTakenPhoto) assert.equal(photo.status,'taken','later exact edits exercise an actually saved keepsake, not an empty fixture');
    const frozenPhoto = JSON.stringify(photo), pose = s.camera_pose, grounding = s.player_grounding, music = s.music_playing;
    if(size.width===520) await page.keyboard.press('F2');
    else{assert.ok(s.mural_compose_entry.visible && s.mural_compose_entry.text_fits, 'real nearby artist offers the Compose Mural entry');await tap(s.mural_compose_entry);}
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot.mural_workshop.visible);
    await settle(); s = await snap();
    const w = s.mural_workshop;
    assert.ok(encloses({x:0,y:0,...size},w.panel) && !w.layout_pending && w.cells.length === 18 && w.tools.length === 3);
    for (const b of [...w.cells,...w.tools,...w.options]) assert.ok(b.width >= 44 && b.height >= 44 && b.text_fits && encloses(w.panel,b), `full workshop target fits: ${b.text}`);
    assert.deepEqual(w.tools.map(b=>b.text),['Lulu\nSun','Dez\nWave','Celeste\nRise']);
    if(Object.keys(before.mural_placements).length===0){
      for(const [tool,index] of [[0,0],[1,7],[2,17]]){
        assert.ok((await snap()).mural_workshop.tools[tool].selected,'first unplaced contribution is offered automatically');
        const b=(await snap()).mural_workshop.cells[index];await tap(b);
        assert.deepEqual(JSON.parse(await save()).mural_placements[['sun','wave','rise'][tool]],{col:b.col,row:b.row});
        workshopAutoAdvanceChecks++;
      }
    }
    for (let tool=0;tool<3;tool++) {
      const prior = await save();
      await tap((await snap()).mural_workshop.tools[tool]);
      assert.equal(await save(),prior,'choosing a contributor changes no artwork/progress');
      s = await snap();
      const id = ['sun','wave','rise'][tool];
      const target = s.mural_workshop.cells.find(b=>!b.occupant);
      assert.ok(target,'an exact empty space exists without replacing another contribution');
      await tap(target);
      const placed = JSON.parse(await save());
      assert.deepEqual(placed.mural_placements[id],{col:target.col,row:target.row},'real cell input saves the exact selected coordinates');
      assert.ok((await snap()).mural_workshop.reader.text.includes(`column ${target.col+1}, row ${target.row+1}`));
      if(tool===2) assert.ok(/Celeste:/.test((await snap()).mural_workshop.reader.text) && /Lulu|Dez/.test((await snap()).mural_workshop.reader.text),'artist responds to the arrangement');
      const same = await save();
      await tap((await snap()).mural_workshop.cells[target.row*6+target.col]);
      assert.equal(await save(),same,'same-cell tap cannot replay rewards/save');
    }
    s = await snap();
    assert.equal(s.mural_workshop.cells.filter(b=>b.occupant).length,3,'three original contributions complete the mural');
    assert.ok(!s.story_detail.panel.visible,'chapter advancement does not take focus away from the workshop');
    // Occupied-cell rejection is real input and must retain both progress and art.
    await tap(s.mural_workshop.tools[0]); s = await snap();
    const occupied = s.mural_workshop.cells.find(b=>b.occupant==='wave'), saved = await save();
    await tap(occupied);
    assert.equal(await save(),saved);
    assert.ok((await snap()).mural_workshop.reader.text.includes('nothing has moved'));
    // Pointer focus followed by real arrow/Space input exercises grid navigation.
    const sun = (await snap()).mural_workshop.cells.find(b=>b.occupant==='sun');
    await tap(sun);
    await page.keyboard.press(sun.col===5?'ArrowLeft':'ArrowRight'); await settle();
    const focused = (await snap()).mural_workshop.focused_cell;
    assert.equal(focused,sun.row*6+(sun.col===5?4:sun.col+1));
    assert.ok((await snap()).announcement.includes(`Column ${focused%6+1}, row ${Math.floor(focused/6)+1}`),'real arrow input announces the precise spot even without visual coordinate tiles');
    const dest = (await snap()).mural_workshop.cells[focused];
    // A real mouse hover must never move or hide a keyboard Space target.
    const hover=(await snap()).mural_workshop.cells.find(b=>!b.occupant&&b.row*6+b.col!==focused),hoverBefore=await save(),cb=await page.locator('#canvas').boundingBox();
    await page.mouse.move(cb.x+(hover.x+hover.width/2)*cb.width/size.width,cb.y+(hover.y+hover.height/2)*cb.height/size.height);await settle();
    const mixed=await snap();assert.equal(mixed.mural_workshop.art.guide_cell,focused);assert.equal(mixed.mural_workshop.art.hover_cell,hover.row*6+hover.col);assert.equal(await save(),hoverBefore,'hover previews never write art');
    const focusPixels=screenshotPixels(await page.screenshot());let focusInk=Infinity;
    for(let dx=2;dx<=5;dx++)focusInk=Math.min(focusInk,focusPixels.pixel(cb.x+(dest.x+dx)*cb.width/size.width,cb.y+(dest.y+dest.height/2)*cb.height/size.height).reduce((a,b)=>a+b,0));
    assert.ok(focusInk<280,'the keyboard ink guide remains visibly dark while another spot is hovered');
    await page.keyboard.press('Space'); await settle();
    assert.equal((await snap()).mural_workshop.cells[hover.row*6+hover.col].occupant,'','Space cannot paint the mouse hover instead of the focused spot');
    assert.ok((await snap()).mural_workshop.reader.text.startsWith((await snap()).mural_workshop.cells[focused].accessible_name),'paint/rejection refresh retains the actual focused position and occupant');
    if (!dest.occupant || dest.occupant==='sun') assert.deepEqual(JSON.parse(await save()).mural_placements.sun,{col:dest.col,row:dest.row});
    else assert.equal(await save(),saved);
    await page.keyboard.down('KeyW');
    const held = await snap(); await page.waitForFunction(f=>window.__tenderloinGodotA11ySnapshot.ui_frame>f+5,held.ui_frame);
    await page.keyboard.up('KeyW'); s = await snap();
    assert.equal(s.player_grounding.x,grounding.x); assert.equal(s.player_grounding.z,grounding.z);
    if(size.width===520) assert.deepEqual(s.camera_pose,pose,'composing preserves actual manual camera intent');
    else for(const k of Object.keys(pose)) assert.ok(Math.abs(s.camera_pose[k]-pose[k])<0.001,'composing preserves followed camera within float refit precision');
    // Move Sun once more so the full arrangement response, not a rejection, is read below.
    await tap(s.mural_workshop.cells.find(b=>!b.occupant));
    s = await snap();
    const priorMusicSave = await save();
    await tap(s.mural_workshop.options[1]); assert.equal((await snap()).music_playing,!music);
    await tap((await snap()).mural_workshop.options[1]); assert.equal((await snap()).music_playing,music);
    assert.equal(await save(),priorMusicSave,'workshop music is independent of game progress');
    for(let i=0;i<(size.width===originalSize.width?27:3);i++){
      await page.keyboard.press('Tab'); await settle();
      assert.ok((await snap()).mural_workshop.focus_within,'Tab cannot focus hidden street controls');
    }
    await page.keyboard.press('Shift+Tab'); await settle();
    assert.ok((await snap()).mural_workshop.focus_within,'reverse traversal stays in the workshop');
    const palette = JSON.parse(await save()).mural_palette, oldPaper=(await snap()).mural_workshop.art.paper;
    const beforeWash=await snap(),washCanvas=beforeWash.mural_workshop.art.canvas,washBox=await page.locator('#canvas').boundingBox();
    const washPixel=png=>screenshotPixels(png).pixel(washBox.x+(washCanvas.x+6)*washBox.width/size.width,washBox.y+(washCanvas.y+6)*washBox.height/size.height);
    const actualWashBefore=washPixel(await page.screenshot());
    await tap((await snap()).mural_workshop.options[0]);
    assert.notEqual(JSON.parse(await save()).mural_palette,palette);
    assert.notEqual((await snap()).mural_workshop.art.paper,oldPaper,'palette changes the canvas wash model');
    assert.notDeepEqual(washPixel(await page.screenshot()),actualWashBefore,'real palette input visibly repaints the same paper pixel');
    s=await snap();
    if(size.width===520) assert.deepEqual(s.camera_pose,pose,'palette preserves the manually owned camera');
    else for(const k of Object.keys(pose)) assert.ok(Math.abs(s.camera_pose[k]-pose[k])<0.001,'palette does not reframe the followed scene behind the workshop');
    assert.ok(s.overlays.reward.remaining>0&&!s.overlays.reward.visible,'valid input always leaves a queued unseen reward, including expanded Info');
    assert.equal(JSON.stringify(JSON.parse(await save()).epilogue.photo),frozenPhoto,'later arrangement and palette edits preserve the copied photo');
    // Read all of an overflowing arrangement response with genuine wheel/finger input.
    s = await snap(); const reader=s.mural_workshop.reader, c=await page.locator('#canvas').boundingBox();
    assert.ok(reader.scroll_max>reader.scroll_page,'workshop feedback really overflows its two-line reader');
    const x=c.x+(reader.control.x+reader.control.width/2)*c.width/size.width, y=c.y+(reader.control.y+reader.control.height/2)*c.height/size.height;
    if(touch){const finger=await context.newCDPSession(page);await finger.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await finger.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-18,id:1}]});await finger.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await finger.detach();await settle();assert.ok((await snap()).mural_workshop.reader.scroll_value>0,'real finger reads workshop feedback');}
    await page.mouse.move(x,y); await page.mouse.wheel(0,1200); await settle();
    const read=(await snap()).mural_workshop.reader;
    assert.ok(read.scroll_value>0 && read.scroll_value+read.scroll_page>=read.scroll_max-1,'complete response reaches its final line');
    await page.screenshot({path:`artifacts/codex-mural-workshop-${size.width}x${size.height}-${touch?'touch':'mouse'}${requireTakenPhoto?'':'-fresh'}.png`});
    await writeFile(`artifacts/codex-mural-workshop-${size.width}x${size.height}-${touch?'touch':'mouse'}${requireTakenPhoto?'':'-fresh'}.json`,JSON.stringify(await snap(),null,2));
    const paintedPixels=await verifyPaintedMuralPixels(page,await snap());
    paintedPixels.signature=await verifyMuralSignaturePixels(page,await snap());
    const cue=(await snap()).overlays.reward;
    assert.ok(cue.remaining>0,'the hidden-reward timer assertion is nonvacuous');
    await page.waitForFunction(f=>window.__tenderloinGodotA11ySnapshot.ui_frame>f+4,(await snap()).ui_frame);assert.ok(!(await snap()).overlays.reward.visible);assert.equal((await snap()).overlays.reward.remaining,cue.remaining,'hidden progress reward retains its reading time with Info collapsed or expanded');
    for(const boundary of [{width:320,height:568},{width:640,height:360},size]){await page.setViewportSize(boundary);await settle();assert.ok(encloses({x:0,y:0,...boundary},(await snap()).mural_workshop.panel));}
    const finalArt=JSON.parse(await save()).mural_placements;
    await tap((await snap()).mural_workshop.options[2]);
    assert.ok(!(await snap()).mural_workshop.visible);
    // Any earned chapter card may now appear; Escape dismisses it without music changes.
    if((await snap()).story_detail.panel.visible){await page.keyboard.press('Escape');await settle();}
    else if(size.width!==520){assert.ok((await snap()).mural_compose_focused,'Back retains the real entry focus across frames');await page.keyboard.press('Enter');await settle();assert.ok((await snap()).mural_workshop.visible,'Enter reopens the retained entry');await page.keyboard.press('Escape');await settle();}
    assert.equal((await snap()).music_playing,music);
    await page.keyboard.press('F2'); await settle();
    assert.ok((await snap()).mural_workshop.visible,'real F2 reopens the nearby workshop');
    assert.deepEqual(JSON.parse(await save()).mural_placements,finalArt);
    await page.keyboard.press('Escape'); await settle();
    assert.ok(!(await snap()).mural_workshop.visible && (await snap()).mural_detail.panel.visible,'Escape returns to the artist');
    assert.equal((await snap()).player_grounding.x,grounding.x); assert.equal((await snap()).player_grounding.z,grounding.z);
    assert.ok(Buffer.byteLength(await save(),'utf8')<=4096);
    if((await snap()).header_details_expanded) await tap((await snap()).info_control);
    paintedPixels.streetSignature=await verifyStreetSignature(page,tap,snap);
    muralWorkshopChecks.push({...size,touch,photoStatus:photo.status,placements:3,paintedPixels});
  }
  await page.setViewportSize(originalSize);
  const saved = JSON.parse(await save());
  await page.reload(); await page.locator('#status').waitFor({state:'hidden',timeout:60000});
  await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.startup_pending && !window.__tenderloinGodotA11ySnapshot.layout_refit_pending);
  const restored=JSON.parse(await save());
  assert.deepEqual(restored.mural_placements,saved.mural_placements,'exact edited art survives actual reload');
  assert.equal(restored.mural_palette,saved.mural_palette);
  assert.deepEqual(restored.epilogue.photo,saved.epilogue.photo);
}

async function verifyShortWalking(page,context,touch) {
  const snapshot=()=>page.evaluate(()=>window.__tenderloinGodotA11ySnapshot);
  async function settle(){const s=await snapshot();await page.waitForFunction(f=>window.__tenderloinGodotA11ySnapshot.ui_frame>f+3&&!window.__tenderloinGodotA11ySnapshot.compact_panel_layout_pending&&!window.__tenderloinGodotA11ySnapshot.layout_refit_pending,s.ui_frame);}
  const encloses=(a,b)=>b.x>=a.x-1&&b.y>=a.y-1&&b.x+b.width<=a.x+a.width+1&&b.y+b.height<=a.y+a.height+1;
  const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
  async function tap(b){b=await revealPhoneControl(page,b,tap);const s=await snapshot(),c=await page.locator('#canvas').boundingBox();assert.ok(b.visible&&b.width>=44&&b.height>=44);const x=c.x+(b.x+b.width/2)*c.width/s.viewport_width,y=c.y+(b.y+b.height/2)*c.height/s.viewport_height;if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);await settle();}
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
    await page.keyboard.press('KeyG');await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.block_panel_control.visible&&window.__tenderloinGodotA11ySnapshot.block_hub_actions.length===4);await settle();await tap((await snapshot()).block_close_control);
    await page.waitForFunction(()=>!window.__tenderloinGodotA11ySnapshot.block_panel_control.visible&&window.__tenderloinGodotA11ySnapshot.following_player);await settle();const closed=await snapshot();assert.ok(closed.short_narrow_walking&&encloses(closed.play_area,closed.overlays.player),'hub Close alone restores the followed short walking view before Find Me');
    await tap((await snapshot()).walking_controls[2]);let s=await snapshot();const save=await page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1'));
    assert.ok(s.short_narrow_walking&&s.following_player&&!s.block_panel_control.visible&&s.play_area.height>=100&&s.overlays.player.width>0&&encloses(s.play_area,s.overlays.player),'Close and Find Me retain the full enlarged player and YOU in short walking space');
    assertWalkingCaptions(s);
    for(const b of s.walking_controls.filter(b=>b.visible))assert.ok(b.text_fits&&b.height>=50&&b.width>=44&&encloses({x:0,y:0,width,height},b),'full original walking labels and50px targets fit');
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
  async function tap(b) {b=await revealPhoneControl(page,b,tap);
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
    let conversation = await snapshot(); const save = await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1'));
    if(conversation.phone_disclosure.enabled&&!conversation.phone_disclosure.actions_open){await tap(conversation.conversation_detail.buttons[1]);conversation=await snapshot();}
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
      for(const b of [s.block_page_previous,s.block_page_next,s.block_close_control,s.rhythm_circle.entry,s.civic_listening.entry,s.power_story.entry].filter(b=>b.visible)) assert.ok(b.width>=44&&b.height>=44&&encloses(panel,b),'ALL six actual navigation siblings fit inside the on-screen hub');
      for (const b of [...s.block_hub_actions,s.block_page_previous,s.block_page_next,s.block_close_control]) assert.ok(b.width >= 44 && b.height >= 44 && encloses(panel,b), 'all narrow menu targets remain reachable');
      for (const b of s.block_hub_actions) { assert.ok(b.text_fits, `full narrow hub title: ${b.text}`); seen.push(b.id); fullTitles.push(b.text); }
      for (const b of s.walking_controls.filter(b=>b.visible)) assert.ok(b.width >= 44 && b.height >= 44 && b.text_fits && encloses(screen,b), 'compact walking targets fit');
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
    assertWalkingCaptions(s);
    for (const b of s.walking_controls.filter(b=>b.visible)) assert.ok(b.height >= 50);
    assert.equal(await page.evaluate(() => localStorage.getItem('tenderloin-redux.godot.save.v1')),save,'hub reading/paging/Info/Close preserve progression');
    if (width === 320) {
      await page.keyboard.press('Digit1'); await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot.conversation_detail.panel.visible); await settle();
      const prior=await snapshot(), a=prior.play_area, cv=await page.locator('#canvas').boundingBox();
      await page.mouse.move(cv.x+(a.x+a.width/2)*cv.width/width,cv.y+(a.y+a.height/2)*cv.height/height);
      await page.mouse.down(); await page.mouse.move(cv.x+(a.x+a.width/2+12)*cv.width/width,cv.y+(a.y+a.height/2+4)*cv.height/height,{steps:3}); await page.mouse.up(); await settle();
      const manual=await snapshot(); assert.equal(manual.following_player,false); assert.notDeepEqual(manual.camera_pose,prior.camera_pose,'actual scene drag changes the camera pose');
      if(manual.phone_disclosure.enabled&&!manual.phone_disclosure.actions_open) await tap(manual.conversation_detail.buttons[1]);
      await tap((await snapshot()).conversation_detail.buttons.find(b=>b.visible&&b.text==='All Actions'));
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
      if(still.phone_disclosure.enabled) await tap(still.block_close_control); // Close hub through its visible original control before Explore.
      await tap(still.walking_controls[1]); await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot.in_wide_overview);
      await tap((await snapshot()).walking_controls[2]); await page.waitForFunction(() => !window.__tenderloinGodotA11ySnapshot.in_wide_overview && window.__tenderloinGodotA11ySnapshot.camera_view_size===45);
    }
    narrowHubChecks.push({width,height,touch,actions:seen.length});
  }
}

async function verifyShortActivities(page, context, touch, checks, small = false) {
  const snapshot = () => page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
  const settle = async () => { const s = await snapshot(); await page.waitForFunction(f => window.__tenderloinGodotA11ySnapshot.ui_frame > f + 3 && !window.__tenderloinGodotA11ySnapshot.compact_panel_layout_pending && !window.__tenderloinGodotA11ySnapshot.layout_refit_pending, s.ui_frame); };
  async function tap(control) {control=await revealPhoneControl(page,control,tap);
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
          assert.equal(b.text,`>${name[0].toUpperCase()+name.slice(1)} ${cell.col+1},${cell.row+1}`);
          assert.ok(b.text_fits, 'selected placed motif retains its complete name, marker and coordinates');
        }
      }
      // Compact panel sizing can enqueue a two-process-frame camera refit after
      // the pending layout flag clears. Establish a composed, stable baseline
      // BEFORE reader input; exact pose equality below still covers every input.
      let previousReadingLayout = '', stableReadingFrames = 0;
      const readingDeadline = Date.now() + 10000;
      while (stableReadingFrames < 6) {
        assert.ok(Date.now() < readingDeadline, 'reader layout and camera settle before input');
        const frame = s.ui_frame;
        await page.waitForFunction(f => window.__tenderloinGodotA11ySnapshot.ui_frame > f, frame);
        s = await snapshot();
        const readingLayout = JSON.stringify([s.camera_pose, s.camera_view_size, s.play_area, s[key].panel, s[key].control, s[key].text]);
        const ready = !s.layout_refit_pending && !s.compact_panel_layout_pending && !s.player_grounding.path_active;
        stableReadingFrames = ready && readingLayout === previousReadingLayout ? stableReadingFrames + 1 : 0;
        previousReadingLayout = readingLayout;
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
      for (const b of s.walking_controls.filter(b=>b.visible)) assert.ok(b.width >= 44 && b.height >= 44 && b.text_fits && (side ? b.x + b.width <= p.x : b.y >= p.y + p.height), 'walking controls remain clear of the activity');
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
          assert.ok(panel.y >= r.header_control.y + r.header_control.height && (r.side_panel_dock ? controls.x + controls.width <= panel.x : (controls.visible ? controls.y >= panel.y + panel.height : r.phone_disclosure.enabled&&kind==='conversation'&&panel.y+panel.height<=rotated.height-11&&r.conversation_detail.buttons.slice(0,3).every(b=>b.visible))), 'open rotation clears the header and visible walking or talk primaries');
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
      assertWalkingCaptions(closed);
      for (const b of closed.walking_controls.filter(b=>b.visible)) assert.ok(b.height >= 50, 'Close restores original walking target height');
    }
  }
}
async function verifyPassiveActivities(page,context,touch) {
  const snap=()=>page.evaluate(()=>window.__tenderloinGodotA11ySnapshot);
  const settle=async()=>{const s=await snap();await page.waitForFunction(f=>window.__tenderloinGodotA11ySnapshot.ui_frame>f+3&&!window.__tenderloinGodotA11ySnapshot.compact_panel_layout_pending,s.ui_frame);};
  const fits=(a,b)=>b.width>0&&b.x>=a.x-1&&b.y>=a.y-1&&b.x+b.width<=a.x+a.width+1&&b.y+b.height<=a.y+a.height+1;
  async function tap(b){b=await revealPhoneControl(page,b,tap);const s=await snap(),c=await page.locator('#canvas').boundingBox();assert.ok(b.visible&&b.width>=44&&b.height>=44);const x=c.x+(b.x+b.width/2)*c.width/s.viewport_width,y=c.y+(b.y+b.height/2)*c.height/s.viewport_height;if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);await settle();}
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


const loanHomecomingChecks=[];
async function verifyLoanHomecoming(page,touch,size,privateFixture=false,idOverride='') {
  const snap=()=>page.evaluate(()=>window.__tenderloinGodotA11ySnapshot),save=()=>page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1'));
  async function settle(){const f=(await snap()).ui_frame;await page.waitForFunction(f=>{const s=window.__tenderloinGodotA11ySnapshot;return s.ui_frame>f+3&&!s.layout_refit_pending&&!s.compact_panel_layout_pending;},f);}
  async function tap(b){b=await revealPhoneControl(page,b,tap);const s=await snap(),c=await page.locator('#canvas').boundingBox();assert.ok(b&&b.visible!==false&&b.width>=44&&b.height>=44,'real loan action is visible and44px');const x=c.x+(b.x+b.width/2)*c.width/s.viewport_width,y=c.y+(b.y+b.height/2)*c.height/s.viewport_height;if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);await settle();}
  const id=idOverride||(size.width===1100||size.width===520?'paint-case':size.width===390||size.width===559?'speaker':'table');
  const owner={'paint-case':{key:'2',name:'Celeste'},speaker:{key:'3',name:'Rook'},table:{key:'5',name:'Thanh'}}[id];
  const before=JSON.parse(await save()),legacy=await page.evaluate(()=>localStorage.getItem('tenderloin-redux.save.v1'));
  assert.ok(before.epilogue.packing&&before.epilogue.returned.length<3&&!before.epilogue.returned.includes(id),'pending-loan state is nonvacuous');
  if((await snap()).story_detail.panel.visible)await page.keyboard.press('Escape');
  await page.keyboard.press(owner.key);
  await page.waitForFunction(id=>{const s=window.__tenderloinGodotA11ySnapshot;return !s.player_grounding.path_active&&(id==='paint-case'?s.mural_detail.panel.visible:id==='speaker'?s.music_detail.panel.visible:s.conversation_actions.some(a=>a.id==='return_owner:table'));},id,{timeout:90000});await settle();
  assert.deepEqual(JSON.parse(await save()).epilogue.returned,before.epilogue.returned,'walking to an owner never auto-returns');
  if(id!=='table'){
    const detail=id==='speaker'?(await snap()).music_detail:(await snap()).mural_detail;
    assert.ok(detail.panel.visible,'original owner activity still opens on arrival');
    await tap(detail.buttons.find(b=>b.text.toLowerCase().includes('chat')));
  }
  await page.waitForFunction(id=>window.__tenderloinGodotA11ySnapshot.conversation_actions.some(a=>a.id==='return_owner:'+id),id);await settle();
  let s=await snap(),b=s.conversation_actions.find(a=>a.id==='return_owner:'+id);
  assert.equal(s.conversation_actions[0].id,b.id);assert.equal(b.label,'Return '+s.loan_homecoming.items.find(x=>x.id===id).title);assert.ok(s.conversation_detail.buttons.find(x=>x.text===b.label).text_fits);
  // Give the camera real manual ownership before testing that a return preserves it.
  {const r=s.play_area,c=await page.locator('#canvas').boundingBox(),x=c.x+(r.x+r.width*.45)*c.width/s.viewport_width,y=c.y+(r.y+r.height*.5)*c.height/s.viewport_height;
   if(touch){const cd=await page.context().newCDPSession(page);await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});for(let i=1;i<=6;i++)await cd.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+22*i/6,y,id:1}]});await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cd.detach();}
   else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+22,y,{steps:6});await page.mouse.up();}await settle();s=await snap();assert.equal(s.following_player,false);}
  const camera=s.camera_pose,point=s.player_grounding,quiet=[s.music_playing,s.music_mode,s.music_volume,s.reward_sounds_enabled];
  if(size.width===320){
    // The manual scene pan releases GUI focus. Focus the real Hint control,
    // then use actual Tab/Space rather than injecting a game focus/action hook.
    await tap((await snap()).conversation_actions.find(a=>a.id==='whats_next'));
    assert.deepEqual((await snap()).camera_pose,camera,'a real Hint preserves the manually owned view');
    for(let i=0;i<8;i++){if((await snap()).loan_homecoming.focused_action===b.id)break;await page.keyboard.press('Tab');await settle();}
    assert.equal((await snap()).loan_homecoming.focused_action,b.id);await page.keyboard.press('Space');await settle();
  }else await tap(b);
  const result=JSON.parse(await save());s=await snap();
  const expected=['table','paint-case','speaker'].filter(x=>x===id||before.epilogue.returned.includes(x));
  assert.deepEqual(result.epilogue.returned,expected,'only selected owner loan returned, allowing any order in canonical storage');
  assert.deepEqual(result.epilogue.photo,before.epilogue.photo,'frozen copied keepsake is untouched');
  assert.equal(result.celeste_talk_count,before.celeste_talk_count+(id==='paint-case'?1:0),'explicit Celeste Chat retains exactly one original talk callback; other owners add none');
  assert.deepEqual(s.camera_pose,camera,'direct return preserves current camera exactly');
  assert.deepEqual([s.music_playing,s.music_mode,s.music_volume,s.reward_sounds_enabled],quiet);
  assert.equal(s.player_grounding.x,point.x);assert.equal(s.player_grounding.z,point.z);
  assert.ok(s.announcement.includes(owner.name+':')&&s.announcement.includes('Returned'),'progress and correct owner reply stay readable');
  const kit=s.loan_homecoming.items.find(x=>x.id===id);assert.ok(kit.returned&&kit.visible&&kit.parts>=3);
  assert.equal(await page.evaluate(()=>localStorage.getItem('tenderloin-redux.save.v1')),legacy);assert.ok(Buffer.byteLength(await save(),'utf8')<=4096);
  await page.screenshot({path:`artifacts/loan-homecoming-${size.width}-${touch?'finger':'mouse'}-${id}.png`});await writeFile(`artifacts/loan-homecoming-${size.width}-${touch?'finger':'mouse'}-${id}.json`,JSON.stringify(s,null,2));
  if(expected.length===3&&size.width===1100&&!privateFixture){await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.story_detail.panel.visible);s=await snap();assert.ok(s.announcement.startsWith('Returned all three neighbor loans (3/3). '+owner.name+':')&&s.announcement.includes('Chapter '),'genuine Chapter3 card itself announces earned3/3 and final owner voice');}
  if(expected.length<3){const once=await save(),receipt=s.conversation_detail.buttons[3];assert.ok(s.conversation_actions[0].label.startsWith('Returned '));await tap(receipt);await settle();assert.equal(await save(),once,'repeated real activation on receipt returns no other owner and writes no save');}
  if(privateFixture){await page.reload();await page.locator('#status').waitFor({state:'hidden',timeout:60000});await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.startup_pending);await page.keyboard.press('Escape');await settle();assert.deepEqual(JSON.parse(await save()).epilogue.returned,expected);assert.deepEqual(JSON.parse(await save()).epilogue.photo,before.epilogue.photo);assert.ok((await snap()).loan_homecoming.items.find(x=>x.id===id).visible);}
  loanHomecomingChecks.push({...size,touch,id,privateFixture,returned:result.epilogue.returned,parts:kit.parts});
}
const loanWorldChecks=[];
async function verifyLoanWorld(browser,completedSave,base) {
 const images={},poses={};
 for(const returned of [false,true]){
  const fixture=JSON.parse(completedSave);fixture.epilogue.returned=returned?['table','paint-case','speaker']:[];fixture.epilogue.packing=true;
  const context=await browser.newContext({viewport:{width:1100,height:760}});await context.addInitScript(f=>localStorage.setItem('tenderloin-redux.godot.save.v1',JSON.stringify(f)),fixture);
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(String(e)));context.on('request',r=>{if(![base,'blob:','data:'].some(p=>r.url().startsWith(p)))external.push(r.url());});
  const snapshot=()=>page.evaluate(()=>window.__tenderloinGodotA11ySnapshot);
  const settle=async()=>{const f=(await snapshot()).ui_frame;await page.waitForFunction(f=>window.__tenderloinGodotA11ySnapshot.ui_frame>f+3&&!window.__tenderloinGodotA11ySnapshot.layout_refit_pending,f);};
  await page.goto(base);await page.locator('#status').waitFor({state:'hidden',timeout:60000});await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.startup_pending);await page.keyboard.press('Escape');await page.keyboard.press('KeyF');await settle();
  const stored=await page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1'));
  for(const id of ['table','paint-case','speaker']){
   // Actual zoom and scene drags; projected world bounds are read-only evidence.
   await page.keyboard.press('KeyF');await settle();
   for(let i=0;i<6;i++){const s=await snapshot();await phoneAwareMouseClick(page,s.walking_controls[3]);await settle();}
   if(id==='table'){
    // The diner can legitimately occlude this low kit from the default heading.
    // Use the player's real orbit gesture to inspect from the open side; never hide it.
    const s=await snapshot(),r=s.play_area,c=await page.locator('#canvas').boundingBox(),x=c.x+(r.x+r.width*.5)*c.width/s.viewport_width,y=c.y+(r.y+r.height*.5)*c.height/s.viewport_height;
    await page.mouse.move(x,y);await page.mouse.down({button:'right'});await page.mouse.move(x+370*c.width/s.viewport_width,y,{steps:10});await page.mouse.up({button:'right'});await settle();
   }
   for(let i=0;i<30;i++){
    const s=await snapshot(),q=s.loan_homecoming.items.find(x=>x.id===id).corners,r=s.play_area;
    const center={x:q.reduce((a,p)=>a+p.x,0)/q.length,y:q.reduce((a,p)=>a+p.y,0)/q.length};
    const dx=Math.max(-r.width*.35,Math.min(r.width*.35,r.x+r.width*.5-center.x)),dy=Math.max(-r.height*.35,Math.min(r.height*.35,r.y+r.height*.5-center.y));
    if(Math.hypot(dx,dy)<12)break; // Never turn a final sub8px correction into a real street tap.
    const canvas=await page.locator('#canvas').boundingBox(),x=canvas.x+(r.x+r.width*.5)*canvas.width/s.viewport_width,y=canvas.y+(r.y+r.height*.5)*canvas.height/s.viewport_height;
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx*canvas.width/s.viewport_width,y+dy*canvas.height/s.viewport_height,{steps:6});await page.mouse.up();await settle();
   }
   // Force existing common cutaway after the manual view reaches the kit.
   for(const index of [4,3]){const s=await snapshot();await phoneAwareMouseClick(page,s.walking_controls[index]);await settle();}
   const s=await snapshot(),q=s.loan_homecoming.items.find(x=>x.id===id).corners;
   assert.equal(s.player_grounding.path_active,false,'manual inspection never starts a route');
   const region={x:Math.min(...q.map(p=>p.x)),y:Math.min(...q.map(p=>p.y)),width:Math.max(...q.map(p=>p.x))-Math.min(...q.map(p=>p.x)),height:Math.max(...q.map(p=>p.y))-Math.min(...q.map(p=>p.y))};
   assert.ok(region.width>6&&region.height>6&&region.x>=s.play_area.x&&region.x+region.width<=s.play_area.x+s.play_area.width&&region.y>=s.play_area.y&&region.y+region.height<=s.play_area.y+s.play_area.height,'deliberate manual view contains actual kit bounds');
   const path=`artifacts/loan-world-${id}-${returned?'returned':'pending'}.png`,png=await page.screenshot({path});
   images[id+returned]={pixels:screenshotPixels(png),region};poses[id+returned]=s.camera_pose;
   await writeFile(path.replace('.png','.json'),JSON.stringify({limit:'PRIVATE static before/after state render from THIS completed profile; not a live transition. Actual owner callback evidence is separate.',id,returned,snapshot:s},null,2));
  }
  assert.equal(await page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1')),stored,'manual kit inspection writes no save');await context.close();
 }
 for(const id of ['table','paint-case','speaker']){
  assert.deepEqual(poses[id+'false'],poses[id+'true'],'paired static render uses exact same real-input manual camera');
  const a=images[id+'false'],b=images[id+'true'],r=b.region;let changed=0;
  // Top38% isolates raised carrying gear, avoiding the pre-existing gold counter base.
  for(let y=Math.ceil(r.y);y<r.y+r.height*.38;y++)for(let x=Math.ceil(r.x);x<r.x+r.width;x++)if(a.pixels.pixel(x,y).reduce((sum,c,i)=>sum+Math.abs(c-b.pixels.pixel(x,y)[i]),0)>35)changed++;
  assert.ok(changed>=12,`${id} actual raised kit adds pixels beyond base recolor: ${changed}`);loanWorldChecks.push({id,changed,region:r,scope:'PRIVATE static rendered before/after; native mesh and genuine live return inputs separately verified'});
 }
}

const sharedPanelChecks=[];
async function verifySharedPanel(page,touch,size,active=false){
  const snap=()=>page.evaluate(()=>window.__tenderloinGodotA11ySnapshot),save=()=>page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1'));
  const settle=async()=>{const f=(await snap()).ui_frame;await page.waitForFunction(f=>{const s=window.__tenderloinGodotA11ySnapshot;return s.ui_frame>f+4&&!s.layout_refit_pending&&!s.shared_panel.layout_pending;},f);};
  async function tap(b,reading=false,disabled=false){b=await revealPhoneControl(page,b,tap);assert.ok(b&&b.visible!==false&&b.width>=44&&b.height>=(reading?1:44)&&(!b.disabled||disabled),'real reachable Shared Panel target');const s=await snap(),c=await page.locator('#canvas').boundingBox(),x=c.x+(b.x+b.width/2)*c.width/s.viewport_width,y=c.y+(b.y+b.height/2)*c.height/s.viewport_height;if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);await settle();}
  await page.setViewportSize(size);await settle();if((await snap()).story_detail.panel.visible){await page.keyboard.press('Escape');await settle();}
  if(!active){await page.keyboard.press('4');await page.waitForFunction(()=>{const s=window.__tenderloinGodotA11ySnapshot;return /^(?:Talking with )?Dez (?:\(|\u00b7 Turn )/.test(s?.conversation_header || '')&&s.conversation_detail.panel.visible&&!s.player_grounding.path_active;},null,{timeout:90000});await settle();const s=await snap();if(s.phone_disclosure.enabled&&!s.phone_disclosure.actions_open)await tap(s.conversation_detail.buttons[1]);await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.conversation_actions.some(b=>b.id==='shared_panel'));await settle();}
  else{assert.equal((await snap()).hosting_current,'art');if(!(await snap()).block_panel_control.visible)await page.keyboard.press('KeyG');await settle();}
  // Own the camera through actual scene input before opening the art paper.
  {const s=await snap(),r=s.play_area,c=await page.locator('#canvas').boundingBox(),x=c.x+(r.x+r.width*.35)*c.width/s.viewport_width,y=c.y+(r.y+r.height*.5)*c.height/s.viewport_height,dx=Math.min(55,r.width*.25)*c.width/s.viewport_width;
   if(touch){const cd=await page.context().newCDPSession(page);await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});for(let i=1;i<=6;i++)await cd.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/6,y,id:1}]});await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cd.detach();}
   else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y,{steps:6});await page.mouse.up();}await settle();assert.equal((await snap()).following_player,false);}
  let entry;
  if(active){for(let p=0;p<3;p++){entry=(await snap()).block_hub_actions.find(b=>b.visible&&b.text.includes('Host Activity'));if(entry)break;await tap((await snap()).block_page_next);}}
  else entry=(await snap()).conversation_actions.find(b=>b.id==='shared_panel');
  const before=await save(),initial=JSON.parse(before),photo=JSON.stringify(initial.epilogue.photo),pose=(await snap()).camera_pose,point=(await snap()).player_grounding,quiet=[(await snap()).music_playing,(await snap()).music_volume,(await snap()).music_mode,(await snap()).reward_sounds_enabled],legacy=await page.evaluate(()=>localStorage.getItem('tenderloin-redux.save.v1'));
  await tap(entry);let p=(await snap()).shared_panel;assert.ok(p.visible&&p.editing===active);assert.equal(await save(),before,'opening never changes any save bytes');
  const original=p.value,oldInk=screenshotPixels(await page.screenshot());let changed=0;
  if(active){
    await tap(p.buttons[0]);await page.keyboard.press('ArrowRight');await page.keyboard.press('Space');await settle();for(let i=2;i<6;i++)await tap((await snap()).shared_panel.buttons[i]);
    assert.deepEqual((await snap()).shared_panel.value.tiles,original.tiles.map(n=>(n+1)%3),'all six real targets including Arrow/Space change their own exact cell');
    for(const [id,index] of [['cool',7],['warm',6],['cool',7]]){await tap((await snap()).shared_panel.buttons[index]);assert.equal((await snap()).shared_panel.value.palette,id);}
    p=(await snap()).shared_panel;const next=screenshotPixels(await page.screenshot()),c=await page.locator('#canvas').boundingBox();for(let y=p.picture.y+2;y<p.picture.y+p.picture.height-2;y+=2)for(let x=p.picture.x+2;x<p.picture.x+p.picture.width-2;x+=2){const xx=c.x+x*c.width/size.width,yy=c.y+y*c.height/size.height;if(oldInk.pixel(xx,yy).some((v,i)=>Math.abs(v-next.pixel(xx,yy)[i])>30))changed++;}assert.ok(changed>=30,'real shape/palette changes paint actual visible pixels');
    assert.equal((await snap()).shared_panel.world.some(t=>t.visible),false,'live editing previews on the paper, not a remote invisible world promise');
  }else{assert.ok(p.buttons.slice(0,9).every(b=>b.disabled),'copied art is explicitly read-only');await tap(p.buttons[0],false,true);assert.equal(await save(),before,'actual disabled tile attempt cannot alter copied artwork');assert.deepEqual(p.value,initial.hosting.results.find(r=>r.id==='art').value);}
  p=(await snap()).shared_panel;for(const b of [p.top,p.tray,...p.buttons])assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=size.width+1&&b.y+b.height<=size.height+1,'full art controls remain on screen');
  await tap(p.reader,true);await page.keyboard.press('End');await settle();p=(await snap()).shared_panel;assert.ok(p.scroll_max>0&&Math.abs(p.scroll-p.scroll_max)<=1,'End reads complete Celeste explanation and shape list');
  if(touch){const s=await snap(),r=p.reader,c=await page.locator('#canvas').boundingBox(),x=c.x+(r.x+r.width*.6)*c.width/s.viewport_width,y=c.y+(r.y+6)*c.height/s.viewport_height,dy=(r.height-12)*c.height/s.viewport_height,cd=await page.context().newCDPSession(page);await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});for(let i=1;i<=5;i++)await cd.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+dy*i/5,id:1}]});await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cd.detach();}
  else{await page.mouse.move(p.reader.x+p.reader.width*.5,p.reader.y+p.reader.height*.5);await page.mouse.wheel(0,-180);}await settle();assert.ok((await snap()).shared_panel.scroll<p.scroll,'actual finger/wheel reads back');
  await page.keyboard.down('KeyW');await page.waitForTimeout(160);await page.keyboard.up('KeyW');await settle();assert.equal((await snap()).player_grounding.x,point.x);assert.equal((await snap()).player_grounding.z,point.z);
  const stable=await save(),value=(await snap()).shared_panel.value;
  for(const boundary of [{width:320,height:568},{width:520,height:360},size]){await page.setViewportSize(boundary);await settle();const h=(await snap()).shared_panel;for(const b of h.buttons)assert.ok(b.width>=44&&b.height>=44&&b.x>=0&&b.y>=0&&b.x+b.width<=boundary.width+1&&b.y+b.height<=boundary.height+1,'settled open rotation keeps all44px controls reachable');assert.deepEqual((await snap()).camera_pose,pose);}
  await page.screenshot({path:`artifacts/shared-panel-${size.width}-${touch?'finger':'mouse'}-${active?'draft':'copied'}.png`});
  await tap((await snap()).shared_panel.buttons[10]);assert.deepEqual((await snap()).camera_pose,pose);assert.equal(await save(),stable);assert.deepEqual([(await snap()).music_playing,(await snap()).music_volume,(await snap()).music_mode,(await snap()).reward_sounds_enabled],quiet);
  await page.reload();await page.locator('#status').waitFor({state:'hidden',timeout:60000});await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.startup_pending);await page.keyboard.press('Escape');await settle();assert.equal(await save(),stable,'reload writes no view state');assert.equal((await snap()).shared_panel.visible,false);
  await page.evaluate(()=>window.addEventListener('keydown',e=>{if(e.code==='F7')setTimeout(()=>window.__sharedPanelF7Prevented=e.defaultPrevented,0);},true));
  await page.keyboard.press('F7');await settle();assert.deepEqual((await snap()).shared_panel.value,value);assert.equal(await page.evaluate(()=>window.__sharedPanelF7Prevented),true,'real F7 event has its browser default prevented while canvas is focused');
  if(active){await tap((await snap()).shared_panel.buttons[8]);assert.equal((await snap()).shared_panel.visible,false);assert.deepEqual(JSON.parse(await save()).hosting.results.find(r=>r.id==='art').value,value,'Hang uses the original copied result callback');assert.ok((await snap()).shared_panel.world.every(t=>t.visible),'completed physical panel displays all six painted fronts');}
  else{await page.keyboard.press('Escape');await settle();assert.equal(await save(),stable);}
  assert.equal(JSON.stringify(JSON.parse(await save()).epilogue.photo),photo);assert.equal(await page.evaluate(()=>localStorage.getItem('tenderloin-redux.save.v1')),legacy);assert.ok(Buffer.byteLength(await save())<=4096);
  let worldInk=0;
  if(active&&size.width===1100){
    if((await snap()).story_detail.panel.visible){await page.keyboard.press('Escape');await settle();}
    if((await snap()).block_panel_control.visible)await tap((await snap()).block_close_control);
    const pan=async(dx,dy)=>{const s=await snap(),r=s.play_area,c=await page.locator('#canvas').boundingBox(),x=c.x+(r.x+r.width*.5)*c.width/s.viewport_width,y=c.y+(r.y+r.height*.5)*c.height/s.viewport_height;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx*c.width/s.viewport_width,y+dy*c.height/s.viewport_height,{steps:8});await page.mouse.up();await settle();};
    for(let phase=0;phase<2;phase++){
      for(let lap=0;lap<16;lap++){const s=await snap(),r=s.play_area,w=s.shared_panel.world,x=w.reduce((n,t)=>n+t.x,0)/6,y=w.reduce((n,t)=>n+t.y,0)/6,dx=Math.max(-r.width*.3,Math.min(r.width*.3,r.x+r.width*.5-x)),dy=Math.max(-r.height*.3,Math.min(r.height*.3,r.y+r.height*.5-y));if(Math.hypot(dx,dy)<10)break;await pan(dx,dy);}
      if(phase===0)for(let z=0;z<5;z++)await tap((await snap()).walking_controls.find(b=>b.text.includes('Zoom In')));
    }
    const s=await snap(),c=await page.locator('#canvas').boundingBox(),pixels=screenshotPixels(await page.screenshot());
    for(const tile of s.shared_panel.world){const point=(u,v)=>{const a=tile.corners[1],b=tile.corners[3],d=tile.corners[0];return {x:a.x+(b.x-a.x)*u+(d.x-a.x)*v,y:a.y+(b.y-a.y)*u+(d.y-a.y)*v};},center=point(.5,.5),corner=point(.15,.15);assert.ok(center.x>=s.play_area.x&&center.x<=s.play_area.x+s.play_area.width&&center.y>=s.play_area.y&&center.y<=s.play_area.y+s.play_area.height,'deliberate manual view reaches actual tile front');const rgb=q=>pixels.pixel(c.x+q.x*c.width/s.viewport_width,c.y+q.y*c.height/s.viewport_height),fg=rgb(center),bg=rgb(corner);if(fg.reduce((n,v,i)=>n+(v-bg[i]>3?1:0),0)>=2&&fg.reduce((n,v,i)=>n+Math.abs(v-bg[i]),0)>=22)worldInk++;}
    assert.ok(worldInk>=4,`painted shape ink visibly contrasts with its own tile on at least4actual fronts (${worldInk})`);
    await page.screenshot({path:'artifacts/shared-panel-world-1100.png'});await writeFile('artifacts/shared-panel-world-1100.json',JSON.stringify({sourceFingerprint,world:s.shared_panel.world,worldInk,pose:s.camera_pose},null,2));
    await tap((await snap()).walking_controls.find(b=>b.text.includes('Find Me')));
  }
  sharedPanelChecks.push({width:size.width,height:size.height,touch,active,changed,value,worldInk,worldFaces:(await snap()).shared_panel.world.length});
}

const powerStoryChecks=[];
async function verifyPowerStory(page,touch,size,privateFixture=false){
  const snap=()=>page.evaluate(()=>window.__tenderloinGodotA11ySnapshot),save=()=>page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1'));
  async function settle(){const f=(await snap()).ui_frame;await page.waitForFunction(f=>{const s=window.__tenderloinGodotA11ySnapshot;return s.ui_frame>f+3&&!s.layout_refit_pending&&!s.power_story.layout_pending;},f);}
  async function tap(b){b=await revealPhoneControl(page,b,tap);const s=await snap(),c=await page.locator('#canvas').boundingBox();assert.ok(b?.visible&&!b.disabled&&b.width>=44&&b.height>=44,'real named44px Power Story control');assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=s.viewport_width+1&&b.y+b.height<=s.viewport_height+1,'Power Story target on screen');const x=c.x+(b.x+b.width/2)*c.width/s.viewport_width,y=c.y+(b.y+b.height/2)*c.height/s.viewport_height;if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);await settle();}
  const original=await save(),legacy=await page.evaluate(()=>localStorage.getItem('tenderloin-redux.save.v1'));
  await page.setViewportSize(size);await settle();if((await snap()).story_detail.panel.visible){await page.keyboard.press('Escape');await settle();}
  if((await snap()).block_panel_control.visible){await page.keyboard.press('KeyG');await settle();}
  await page.keyboard.press('KeyG');await settle();
  if(privateFixture&&size.width===520){await tap((await snap()).music_toggle_control);assert.ok((await snap()).music_playing,'one actual finger episode runs with original Music On');}
  const before=await snap(),quiet=[before.music_playing,before.music_mode,before.music_volume,before.reward_sounds_enabled],initialLight=[before.evening_mode,before.power_story.night_glow,before.power_story.pool_alpha];
  for(const n of [before.block_page_previous,before.block_page_next,before.rhythm_circle.entry,before.civic_listening.entry,before.block_close_control,before.power_story.entry].filter(b=>b.visible))assert.ok(n.width>=44&&n.height>=44&&n.x>=0&&n.x+n.width<=size.width+1,'ALL actual navigation siblings fit, including Power/Circle without civic');
  await tap(before.power_story.entry);assert.ok((await snap()).power_story.visible,'real mouse/finger navigation entry opens optional episode');
  await tap((await snap()).power_story.buttons[7]);let s=await snap();assert.ok(s.power_story.active&&!s.power_story.restored);assert.equal(s.power_story.pool_alpha,0);assert.equal(s.evening_mode,initialLight[0]);
  const solutions=[[2,1,0,3],[0,2,1,3],[1,2,3,0]],pixels=[],world=[];
  for(let station=0;station<3;station++){
    await tap((await snap()).power_story.buttons[4+station]);
    await tap((await snap()).power_story.buttons[8]);
    if(station===0){
      await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.player_grounding.path_active);await settle();
      await page.keyboard.down('KeyW');await page.waitForTimeout(120);await page.keyboard.up('KeyW');await settle();
      assert.ok(!(await snap()).power_story.traveling&&!(await snap()).power_story.visible,'real manual walking cancels pending arrival');
      assert.ok((await snap()).objective_control_text.includes('Power Story'),'episode next step stays in the actual world header');
      await tap((await snap()).walking_controls.find(b=>b.text==='Power Story'));await tap((await snap()).power_story.buttons[8]);
      await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.player_grounding.path_active);await settle();
      await tap((await snap()).walking_controls.find(b=>b.text==='Stop Walking'));
      assert.equal((await snap()).power_story.traveling,false,'real Stop cancels pending repair view');assert.equal((await snap()).power_story.visible,false);
      await page.keyboard.press('F8');await settle();await tap((await snap()).power_story.buttons[8]);
    }
    await page.waitForFunction(()=>{const s=window.__tenderloinGodotA11ySnapshot;return s.power_story.visible&&s.power_story.near&&!s.player_grounding.path_active;},null,{timeout:90000});await settle();
    s=await snap();assert.equal(s.power_story.station,station);assert.equal(s.power_story.restored,(1<<station)-1);
    for(const b of s.power_story.buttons)assert.ok(b.visible&&b.width>=44&&b.height>=44&&b.x>=0&&b.y>=0&&b.x+b.width<=size.width+1&&b.y+b.height<=size.height+1,'all connector and full named44px actions fit');
    await tap(s.power_story.buttons[9]);assert.ok((await snap()).power_story.text.includes('Not connected yet'));
    let worldBefore,worldPose,worldRect;
    if(station===0){
      await tap((await snap()).power_story.buttons[12]);await settle();
      // A genuine scene drag owns the camera before the focused repair reopens.
      const t=await snap(),r=t.play_area,c=await page.locator('#canvas').boundingBox(),x=c.x+(r.x+r.width*.45)*c.width/t.viewport_width,y=c.y+(r.y+r.height*.7)*c.height/t.viewport_height;
      if(touch){const cd=await page.context().newCDPSession(page);await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:0}]});for(let k=1;k<=4;k++)await cd.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+24*k/4,y,id:0}]});await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cd.detach();}
      else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+24,y,{steps:4});await page.mouse.up();}
      await settle();const w=await snap();assert.equal(w.following_player,false,'real drag owns manual camera');worldPose=w.camera_pose;worldBefore=screenshotPixels(await page.screenshot());
      const corners=w.power_story.world[0].corners;worldRect={x:Math.min(...corners.map(p=>p.x)),y:Math.min(...corners.map(p=>p.y)),right:Math.max(...corners.map(p=>p.x)),bottom:Math.max(...corners.map(p=>p.y))};
      await page.screenshot({path:`artifacts/power-story-${size.width}-${touch?'finger':'mouse'}-world-dark.png`});
      await page.keyboard.press('F8');await settle();assert.deepEqual((await snap()).camera_pose,worldPose,'opening repair respects real manual pan');
    }
    const position=(await snap()).player_grounding,pose=(await snap()).camera_pose,zoom=(await snap()).camera_view_size;
    if(station===0){for(const boundary of [{width:320,height:667},{width:520,height:360},size]){await page.setViewportSize(boundary);await settle();const z=await snap();for(const b of z.power_story.buttons)assert.ok(b.visible&&b.width>=44&&b.height>=44&&b.x>=0&&b.y>=0&&b.x+b.width<=boundary.width+1&&b.y+b.height<=boundary.height+1,'live rotation keeps all repair controls useful');}assert.deepEqual((await snap()).camera_pose,pose);assert.equal((await snap()).camera_view_size,zoom);}

    await page.keyboard.down('KeyW');await page.waitForTimeout(120);await page.keyboard.up('KeyW');await settle();assert.deepEqual((await snap()).camera_pose,pose,'held walking key cannot take camera during repair');assert.deepEqual([(await snap()).player_grounding.x,(await snap()).player_grounding.z],[position.x,position.z]);
    const diagramBefore=screenshotPixels(await page.screenshot()),art=(await snap()).power_story.picture;
    for(let i=0;i<4;i++){
      s=await snap();const count=(solutions[station][i]-s.power_story.turns[station][i]+4)%4;
      for(let n=0;n<count;n++)await tap((await snap()).power_story.buttons[i]);
    }
    s=await snap();assert.deepEqual(s.power_story.turns[station],solutions[station]);assert.ok(s.power_story.connected,'real connector rotations complete topology');
    const after=screenshotPixels(await page.screenshot()),c=await page.locator('#canvas').boundingBox();let changed=0;
    for(let y=art.y+2;y<art.y+art.height-2;y++)for(let x=art.x+2;x<art.x+art.width-2;x++){const px=c.x+x*c.width/s.viewport_width,py=c.y+y*c.height/s.viewport_height;if(after.pixel(px,py).some((v,i)=>Math.abs(v-diagramBefore.pixel(px,py)[i])>40))changed++;}
    assert.ok(changed>=30,'actual painted connector paths visibly turn, not just a changed status');pixels.push(changed);
    await tap(s.power_story.buttons[9]);assert.equal((await snap()).power_story.restored,(1<<(station+1))-1);assert.equal(await save(),original,'real repairs write no saved chapter/photo/sequence');
    await page.screenshot({path:`artifacts/power-story-${size.width}-${touch?'finger':'mouse'}-relay-${station+1}.png`});
    if(station===0){
      await tap((await snap()).power_story.buttons[12]);await settle();s=await snap();assert.deepEqual(s.camera_pose,worldPose,'world before/after uses exact same manual pose');
      const afterWorld=screenshotPixels(await page.screenshot()),c=await page.locator('#canvas').boundingBox();let changed=0;
      assert.ok(worldRect.x>=0&&worldRect.y>=0&&worldRect.right<size.width&&worldRect.bottom<size.height,'actual lamp projection visible in paired world');
      for(let y=worldRect.y;y<worldRect.bottom;y++)for(let x=worldRect.x;x<worldRect.right;x++){const px=c.x+x*c.width/s.viewport_width,py=c.y+y*c.height/s.viewport_height;if(afterWorld.pixel(px,py).some((v,i)=>Math.abs(v-worldBefore.pixel(px,py)[i])>35))changed++;}
      assert.ok(changed>=3,'real globe pixels light up after this repair');world.push(changed);
      await page.screenshot({path:`artifacts/power-story-${size.width}-${touch?'finger':'mouse'}-world-lit.png`});
      await page.keyboard.press('F8');await settle();
    }
  }
  s=await snap();assert.ok(s.power_story.won&&s.power_story.text.includes('You brought our lights back'));assert.equal(s.power_story.night_glow,1);assert.equal(s.power_story.pool_alpha,1);
  assert.deepEqual([s.music_playing,s.music_mode,s.music_volume,s.reward_sounds_enabled],quiet,'episode never changes quiet/music preferences');
  // Full-size clue reader remains usable through actual page/scroll input.
  await tap(s.power_story.buttons[12]);await page.keyboard.press('F8');await settle();s=await snap();
  {const b=s.power_story.reader,c=await page.locator('#canvas').boundingBox(),x=c.x+(b.x+b.width/2)*c.width/s.viewport_width,y=c.y+(b.y+b.height-8)*c.height/s.viewport_height;
   if(touch){const cd=await page.context().newCDPSession(page);await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:0}]});for(let k=1;k<=5;k++){await cd.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-52*k/5,id:0}]});await page.waitForTimeout(20);}await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cd.detach();}
   else{await page.mouse.click(x,y);await page.keyboard.press('End');}
   await settle();assert.ok((await snap()).power_story.scroll>0,'complete16px reader has real finger or keyboard scrolling');}

  await tap((await snap()).power_story.buttons[10]);assert.equal((await snap()).power_story.active,false);
  assert.deepEqual([(await snap()).evening_mode,(await snap()).power_story.night_glow,(await snap()).power_story.pool_alpha],initialLight,'explicit end restores usual lighting');
  await tap((await snap()).power_story.buttons[7]);assert.ok((await snap()).power_story.active);await page.reload();await page.locator('#status').waitFor({state:'hidden',timeout:60000});await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.startup_pending);await page.keyboard.press('Escape');await settle();
  assert.equal((await snap()).power_story.active,false,'actual reload ends visit-only blackout');assert.equal((await snap()).power_story.restored,0);assert.equal(await save(),original);assert.equal(await page.evaluate(()=>localStorage.getItem('tenderloin-redux.save.v1')),legacy);
  const result={...size,touch,privateFixture,pixels,world,saveBytes:Buffer.byteLength(original),threeWalks:true,stop:true,hero:true,reload:true};powerStoryChecks.push(result);
  await writeFile(`artifacts/power-story-${size.width}-${touch?'finger':'mouse'}.json`,JSON.stringify(result,null,2));
}

const larkinStoryChecks=[];
async function verifyLarkinStory(page,touch,size,privateFixture=false){
  const snap=()=>page.evaluate(()=>window.__tenderloinGodotA11ySnapshot),save=()=>page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1'));
  async function settle(){const f=(await snap()).ui_frame;await page.waitForFunction(f=>{const s=window.__tenderloinGodotA11ySnapshot;return s.ui_frame>f+3&&!s.layout_refit_pending&&!s.power_story.layout_pending;},f);}
  async function tap(b,reader=false){b=await revealPhoneControl(page,b,tap);const s=await snap(),c=await page.locator('#canvas').boundingBox();assert.ok(b?.visible&&!b.disabled&&b.width>=44&&b.height>=(reader?1:44));assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=s.viewport_width+1&&b.y+b.height<=s.viewport_height+1,'Larkin controls fully inside viewport');const x=c.x+(b.x+b.width/2)*c.width/s.viewport_width,y=c.y+(b.y+b.height/2)*c.height/s.viewport_height;if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);await settle();}
  await page.setViewportSize(size);await settle();
  if((await snap()).story_detail.panel.visible){await page.keyboard.press('Escape');await settle();}
  assert.ok(!(await snap()).power_story.active,'dog flow starts only after prior power story explicitly ended');
 const original=await save(),legacy=await page.evaluate(()=>localStorage.getItem('tenderloin-redux.save.v1')),initial=await snap(),quiet=[initial.music_playing,initial.music_volume,initial.music_mode,initial.reward_sounds_enabled],pose=initial.camera_pose;
  await page.keyboard.press('F8');await settle();await tap((await snap()).power_story.buttons[5]);
  let s=await snap(),h=s.power_story;assert.ok(h.historical&&!h.active&&h.site_valid&&h.map_view);assert.deepEqual(s.camera_pose,pose);
  assert.ok(h.text.includes('April 21, 2017')&&h.text.includes('600 Larkin')&&h.text.includes('PG&E restored')&&h.text.includes('not an entrance'));
  assert.ok(Math.hypot(h.site_source_xz[0]+593.405,h.site_source_xz[1]+10.084)<.002,'independently pinned city junction, never spawn fallback');
  const map=screenshotPixels(await page.screenshot()),c=await page.locator('#canvas').boundingBox(),mapX=h.picture.x+(28+(-593.405+620)*1.35)/360*h.picture.width,mapY=h.picture.y+(24+(-10.084+100)*1.35)/240*h.picture.height;
  const dot=map.pixel(c.x+mapX*c.width/s.viewport_width,c.y+mapY*c.height/s.viewport_height);assert.ok(dot[0]>200&&dot[1]>150&&dot[2]<160,`actual gold junction marker matches independent projected point (${dot})`);
  const mapLabelPixels=[];assert.deepEqual(h.map_labels.map(b=>b.text),['Larkin / Eddy','40 m','N','Eddy Street']);
  for(const label of h.map_labels){assert.ok(label.visible&&label.x>=h.picture.x&&label.y>=h.picture.y&&label.x+label.width<=h.picture.x+h.picture.width+1&&label.y+label.height<=h.picture.y+h.picture.height+1);let ink=0;for(let y=label.y;y<label.y+label.height;y++)for(let x=label.x;x<label.x+label.width;x++){const rgb=map.pixel(c.x+x*c.width/s.viewport_width,c.y+y*c.height/s.viewport_height);if(rgb[0]>190&&rgb[1]>180&&rgb[2]>130)ink++;}assert.ok(ink>=5,`actual map label ${label.text} has visible fallback-font ink (${ink})`);mapLabelPixels.push(ink);}
  await page.screenshot({path:`artifacts/larkin-map-${size.width}-${touch?'finger':'mouse'}.png`});
  await tap(h.reader,true);await page.keyboard.press('End');await settle();assert.ok((await snap()).power_story.scroll>0,'complete source reader reaches actual scroll end');
  assert.equal(await save(),original);await tap((await snap()).power_story.buttons[7]);assert.ok((await snap()).power_story.active);
  const solutions=[[2,1,0,3],[0,2,1,3],[1,2,3,0]],arrivals=[],world=[];
  for(let station=0;station<3;station++){
    await tap((await snap()).power_story.buttons[4+station]);const start=(await snap()).player_grounding;
    await tap((await snap()).power_story.buttons[8]);
    await page.evaluate(()=>{window.__larkinTrail=[];});
    if(station===0){await page.waitForFunction(()=>{const s=window.__tenderloinGodotA11ySnapshot;return s.player_grounding.x < -300 && s.player_grounding.path_active;},null,{timeout:180000});await settle();await tap((await snap()).walking_controls.find(b=>b.text==='Stop Walking'));const stopped=await snap();assert.ok(!stopped.power_story.traveling&&!stopped.power_story.via_pending&&!stopped.power_story.visible);const resumeX=stopped.player_grounding.x;await page.keyboard.press('F8');await settle();await tap((await snap()).power_story.buttons[8]);assert.equal((await snap()).power_story.via_pending,false,'mid-Eddy resume avoids eastward detour');await page.evaluate(x=>{window.__larkinResumeX=x;},resumeX);}
    await page.waitForFunction(()=>{const s=window.__tenderloinGodotA11ySnapshot;window.__larkinTrail.push([s.player_grounding.x,s.player_grounding.z]);return s.power_story.visible&&s.power_story.near&&!s.player_grounding.path_active;},null,{timeout:300000});await settle();
    const trail=await page.evaluate(()=>window.__larkinTrail);assert.ok(trail.length>5,'nonvacuous real route samples');const place=JSON.parse(await readFile('godot/data/power_place.json','utf8')),eddy=place.eddy.points;
    function segmentDistance(p,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],q=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(p[0]-a[0]-q*dx,p[1]-a[1]-q*dz);}
    for(const p of trail.filter(p=>p[0]<eddy.at(-1)[0]))assert.ok(Math.min(...eddy.slice(1).map((b,i)=>segmentDistance(p,eddy[i],b)))<=12,'actual western trip samples remain on sourced Eddy corridor');
    if(station===0){const resumeX=await page.evaluate(()=>window.__larkinResumeX);assert.ok(trail.every(p=>p[0]<=resumeX+.01),'real Stop/resume never backtracks east');}
    s=await snap();h=s.power_story;assert.equal(h.station,station);const endpoint=[s.player_grounding.x,s.player_grounding.z];
    if(station===0){assert.ok(Math.hypot(endpoint[0]+593.405,endpoint[1]+10.084)<2,'actual walk reaches real Larkin/Eddy');assert.ok(Math.hypot(endpoint[0]-start.x,endpoint[1]-start.z)>400,'nonvacuous traversal from old gathering area');}
    if(station===1){assert.ok(endpoint[0]>0,'actual trip returns to original Turk gathering');assert.ok(h.text.includes('straight line')&&h.text.includes('Turk near Taylor/Mason'));}
    assert.ok(Math.hypot(endpoint[0]-h.world[station].goal_x,endpoint[1]-h.world[station].goal_z)<2,'actual endpoint reaches the selected light kit');
    if(station===0){const arrived=[...endpoint];await tap(h.buttons[8]);assert.ok((await snap()).power_story.visible&&!(await snap()).player_grounding.path_active,'Walk at reached Larkin stays in view');assert.deepEqual([(await snap()).player_grounding.x,(await snap()).player_grounding.z],arrived);}
    arrivals.push(endpoint);for(const b of h.buttons)assert.ok(b.visible&&b.width>=44&&b.height>=44,'all historical repair actions remain44px');
    await tap(h.buttons[9]);assert.ok((await snap()).power_story.text.includes('Not connected yet'));
    let beforeWorld,worldPose,worldRect;
    if(station===0){
      await tap((await snap()).power_story.buttons[12]);await page.keyboard.press('KeyF');await settle();
      for(let i=0;i<2;i++)await tap((await snap()).walking_controls.find(b=>b.text.includes('Zoom')&&b.text.includes('+')));
      const t=await snap(),r=t.play_area,c=await page.locator('#canvas').boundingBox(),x=c.x+(r.x+r.width*.45)*c.width/t.viewport_width,y=c.y+(r.y+r.height*.7)*c.height/t.viewport_height;
      if(touch){const cd=await page.context().newCDPSession(page);await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:0}]});for(let k=1;k<=4;k++)await cd.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+24*k/4,y,id:0}]});await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cd.detach();}
      else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+24,y,{steps:4});await page.mouse.up();}
      await settle();const w=await snap();assert.equal(w.following_player,false);worldPose=w.camera_pose;beforeWorld=screenshotPixels(await page.screenshot());const q=w.power_story.world[0].corners;worldRect={x:Math.min(...q.map(p=>p.x)),y:Math.min(...q.map(p=>p.y)),right:Math.max(...q.map(p=>p.x)),bottom:Math.max(...q.map(p=>p.y))};
      await page.screenshot({path:`artifacts/larkin-world-${size.width}-${touch?'finger':'mouse'}-before.png`});await page.keyboard.press('F8');await settle();
      const at=(await snap()).player_grounding;await page.keyboard.down('KeyW');await page.waitForTimeout(140);await page.keyboard.up('KeyW');await settle();assert.deepEqual([(await snap()).player_grounding.x,(await snap()).player_grounding.z],[at.x,at.z]);
      await tap((await snap()).power_story.buttons[7]);assert.ok((await snap()).power_story.map_view);
      for(const boundary of [{width:520,height:360},{width:320,height:667},size]){await page.setViewportSize(boundary);await settle();const z=await snap();assert.deepEqual(z.camera_pose,worldPose);for(const b of z.power_story.buttons.filter(b=>b.visible))assert.ok(b.width>=44&&b.height>=44&&b.x>=0&&b.y>=0&&b.x+b.width<=boundary.width+1&&b.y+b.height<=boundary.height+1,'open case-map rotation retains full controls');}
      await tap((await snap()).power_story.buttons[7]);assert.ok(!(await snap()).power_story.map_view);
    }
    for(let i=0;i<4;i++){s=await snap();for(let n=0,count=(solutions[station][i]-s.power_story.turns[station][i]+4)%4;n<count;n++)await tap((await snap()).power_story.buttons[i]);}
    if(!touch&&station===1){const b=(await snap()).power_story.buttons[0];await tap(b);await page.keyboard.press('Space');await page.keyboard.press('Space');await page.keyboard.press('Space');await settle();assert.deepEqual((await snap()).power_story.turns[station],solutions[station],'actual focused Space rotations return to correct path');}
    await tap((await snap()).power_story.buttons[9]);assert.equal((await snap()).power_story.restored,(1<<(station+1))-1);assert.equal(await save(),original);
    if(station===0){await tap((await snap()).power_story.buttons[12]);await settle();s=await snap();assert.deepEqual(s.camera_pose,worldPose);assert.ok(worldRect.x>=0&&worldRect.y>=0&&worldRect.right<size.width&&worldRect.bottom<size.height,'real battery globe fully on screen');const after=screenshotPixels(await page.screenshot()),c=await page.locator('#canvas').boundingBox();let changed=0;for(let y=worldRect.y;y<worldRect.bottom;y++)for(let x=worldRect.x;x<worldRect.right;x++){const px=c.x+x*c.width/s.viewport_width,py=c.y+y*c.height/s.viewport_height;if(after.pixel(px,py).some((v,i)=>Math.abs(v-beforeWorld.pixel(px,py)[i])>35))changed++;}assert.ok(changed>=5,`actual Larkin battery globe lights visibly (${changed})`);world.push(changed);await page.screenshot({path:`artifacts/larkin-world-${size.width}-${touch?'finger':'mouse'}-after.png`});await page.keyboard.press('F8');await settle();}
  }
  s=await snap();assert.ok(s.power_story.won&&s.power_story.text.includes('kept our neighbors connected')&&s.power_story.text.includes('4:46 p.m.'));assert.equal(s.power_story.night_glow,0);assert.equal(s.power_story.pool_alpha,0);assert.deepEqual([s.music_playing,s.music_volume,s.music_mode,s.reward_sounds_enabled],quiet);
  await page.screenshot({path:`artifacts/larkin-finish-${size.width}-${touch?'finger':'mouse'}.png`});await tap(s.power_story.buttons[10]);assert.ok(!(await snap()).power_story.world[0].box_visible);assert.equal(await save(),original);
  await tap((await snap()).power_story.buttons[7]);await page.reload();await page.locator('#status').waitFor({state:'hidden',timeout:60000});await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.startup_pending);await page.keyboard.press('Escape');await settle();assert.ok(!(await snap()).power_story.historical&&!(await snap()).power_story.active);assert.equal(await save(),original);assert.equal(await page.evaluate(()=>localStorage.getItem('tenderloin-redux.save.v1')),legacy);
  const result={...size,touch,privateFixture,arrivals,world,mapDot:dot,mapLabelPixels,sourceFingerprint};larkinStoryChecks.push(result);await writeFile(`artifacts/larkin-story-${size.width}-${touch?'finger':'mouse'}.json`,JSON.stringify(result,null,2));
}

const dogStoryChecks=[];
const votingStoryChecks=[];
async function verifyVotingStory(page,touch,size,privateFixture=false){
 const snap=()=>page.evaluate(()=>window.__tenderloinGodotA11ySnapshot),save=()=>page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1'));
 async function settle(){const f=(await snap()).ui_frame;await page.waitForFunction(f=>{const s=window.__tenderloinGodotA11ySnapshot;return s.ui_frame>f+5&&!s.voting_story.layout_pending;},f);}
 async function tap(b){b=await revealPhoneControl(page,b,tap);const s=await snap(),c=await page.locator('#canvas').boundingBox();assert.ok(b&&b.visible!==false&&b.width>=44&&b.height>=44);const x=c.x+(b.x+b.width/2)*c.width/s.viewport_width,y=c.y+(b.y+b.height/2)*c.height/s.viewport_height;if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);await settle();}
 const before=await save(),legacy=await page.evaluate(()=>localStorage.getItem('tenderloin-redux.save.v1')),quiet=(await snap()).music_playing;
 await page.keyboard.press('F8');await settle();await tap((await snap()).power_story.more_entry);assert.equal((await snap()).story_picker.entries.length,2);
 await tap((await snap()).story_picker.entries[1]);let s=await snap();assert.ok(s.voting_story.visible&&s.voting_story.sites_valid);
 const pose=s.camera_pose;for(const b of s.voting_story.buttons)assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=size.width+1&&b.y+b.height<=size.height+1);
 // Actual source-reader input, including in finger contexts.
 const reader=s.voting_story.reader,c=await page.locator('#canvas').boundingBox();
 if(touch){const session=await page.context().newCDPSession(page),x=c.x+(reader.x+reader.width*.5)*c.width/s.viewport_width,y=c.y+(reader.y+reader.height*.8)*c.height/s.viewport_height;await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let j=1;j<=8;j++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-j*reader.height*.07*c.height/s.viewport_height}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();}
 else{await page.mouse.click(c.x+(reader.x+reader.width*.5)*c.width/s.viewport_width,c.y+(reader.y+reader.height*.5)*c.height/s.viewport_height);await page.keyboard.press('End');}
 await settle();assert.ok((await snap()).voting_story.scroll>0,'actual source reader scrolls');
 await tap((await snap()).voting_story.buttons[3]);await tap((await snap()).voting_story.buttons[4]);assert.ok((await snap()).voting_story.active);assert.deepEqual((await snap()).camera_pose,pose);const held=(await snap()).player_grounding;await page.keyboard.down('KeyW');await page.waitForTimeout(140);await page.keyboard.up('KeyW');await settle();assert.ok(Math.hypot((await snap()).player_grounding.x-held.x,(await snap()).player_grounding.z-held.z)<.01,'held movement stays still in election reader');
 for(const i of [1,0]){
  await tap((await snap()).voting_story.buttons[i]);await tap((await snap()).voting_story.buttons[5]);
  if(!(await snap()).voting_story.near)await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.player_grounding.path_active,null,{timeout:10000});
  if(i===1){await page.waitForTimeout(220);await tap((await snap()).walk_control);assert.ok(!(await snap()).voting_story.traveling);await tap((await snap()).walk_control);await tap((await snap()).voting_story.buttons[5]);}
  await page.waitForFunction(()=>{const s=window.__tenderloinGodotA11ySnapshot;return s.voting_story.visible&&s.voting_story.near&&!s.player_grounding.path_active;},null,{timeout:90000});
  s=await snap();assert.ok(Math.hypot(s.player_grounding.x-s.voting_story.goal[0],s.player_grounding.z-s.voting_story.goal[1])<=2);await tap(s.voting_story.buttons[6]);
 }
 assert.equal((await snap()).voting_story.observed,3);await tap((await snap()).voting_story.buttons[7]);await tap((await snap()).voting_story.buttons[0]);
 await tap((await snap()).voting_story.pads[1]);assert.equal((await snap()).voting_story.placed,0);assert.equal((await snap()).voting_story.observed,3);
 await tap((await snap()).voting_story.pads[0]);await tap((await snap()).voting_story.buttons[1]);await tap((await snap()).voting_story.pads[1]);assert.equal((await snap()).voting_story.phase,3);
 await tap((await snap()).voting_story.buttons[5]);await page.waitForFunction(()=>{const s=window.__tenderloinGodotA11ySnapshot;return s.voting_story.visible&&s.voting_story.near&&!s.player_grounding.path_active;},null,{timeout:90000});await tap((await snap()).voting_story.buttons[8]);s=await snap();assert.ok(s.voting_story.won&&s.voting_story.paper_visible);assert.deepEqual(s.voting_story.map_labels.map(l=>l.text),['1 380 Eddy St\nCadillac','2 246 Eddy St\nBoeddeker']);assert.ok(s.voting_story.map_labels.every(l=>l.visible&&l.x>=0&&l.y>=0&&l.x+l.width<=size.width+1&&l.y+l.height<=size.height+1));
 assert.equal(await save(),before);assert.equal(s.music_playing,quiet);assert.match(s.voting_story.text,/later relocations unverified/);assert.match(s.voting_story.text,/398 Eddy/);assert.match(s.voting_story.text,/240 Eddy/);
 await page.screenshot({path:`artifacts/voting-${size.width}-${touch?'finger':'mouse'}.png`});
 const completed=s.voting_story;await tap(completed.buttons[11]);await page.keyboard.press('KeyF');await settle();
 for(let i=0;i<6;i++)await tap((await snap()).walking_controls.find(b=>b.text.includes('Zoom')&&b.text.includes('+')));
 await page.screenshot({path:`artifacts/voting-world-${size.width}-${touch?'finger':'mouse'}.png`});await writeFile(`artifacts/voting-world-${size.width}-${touch?'finger':'mouse'}.json`,JSON.stringify({snapshot:await snap(),sourceFingerprint},null,2));
 const inspection=(await snap()).camera_pose;await page.keyboard.press('F8');await settle();assert.deepEqual((await snap()).camera_pose,inspection);assert.ok((await snap()).voting_story.buttons[11].focused);
 await tap((await snap()).voting_story.buttons[9]);assert.ok(!(await snap()).voting_story.active);await tap((await snap()).voting_story.buttons[11]);
 await page.reload();await page.locator('#status').waitFor({state:'hidden',timeout:60000});await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.startup_pending);await page.keyboard.press('Escape');await settle();assert.ok(!(await snap()).voting_story.active);assert.equal(await save(),before);assert.equal(await page.evaluate(()=>localStorage.getItem('tenderloin-redux.save.v1')),legacy);
 const result={size,touch,privateFixture,observed:completed.observed,placed:completed.placed,goals:completed.goals,sourceFingerprint};votingStoryChecks.push(result);await writeFile(`artifacts/voting-${size.width}-${touch?'finger':'mouse'}.json`,JSON.stringify(result,null,2));
}

const phoneDisclosureChecks=[];
async function verifyPhoneDisclosure(browser,base){
 for(const size of [{width:390,height:667},{width:320,height:667},{width:390,height:568},{width:320,height:639},{width:390,height:640},{width:390,height:664}]){
  const context=await browser.newContext({viewport:size,hasTouch:true}),page=await context.newPage();latestPage=page;
  page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(![base,'blob:','data:'].some(p=>r.url().startsWith(p)))external.push(r.url());});
  const snap=()=>page.evaluate(()=>window.__tenderloinGodotA11ySnapshot),settle=async()=>{const f=(await snap()).ui_frame;await page.waitForFunction(f=>{const s=window.__tenderloinGodotA11ySnapshot;return s.ui_frame>f+4&&!s.layout_refit_pending&&!s.compact_panel_layout_pending;},f);};
  const tap=async b=>{assert.ok(b.visible,'phone UI tests never tap hidden rectangles');const s=await snap(),c=await page.locator('#canvas').boundingBox();await page.touchscreen.tap(c.x+(b.x+b.width/2)*c.width/s.viewport_width,c.y+(b.y+b.height/2)*c.height/s.viewport_height);await settle();};
  await page.goto(base);await page.locator('#status').waitFor({state:'hidden',timeout:90000});await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.startup_pending);await page.keyboard.press('Enter');await settle();await page.keyboard.press('Digit1');await page.waitForFunction(()=>{const s=window.__tenderloinGodotA11ySnapshot;return s.block_panel_control.visible&&s.conversation_header.startsWith('Bea')&&!s.player_grounding.path_active;});await settle();
  let s=await snap();assert.ok(s.conversation_header.startsWith('Bea')&&s.conversation_header.includes('1/5'));assert.ok(!s.controls_control.visible&&s.block_detail_control.height>=96);assert.equal(s.conversation_detail.font_size,16);
  assert.equal(s.conversation_detail.buttons.filter(b=>b.visible).length,3,'fresh talk has three original primaries');await page.screenshot({path:`artifacts/phone-talk-${size.width}x${size.height}.png`});
  const firstReaderHeight=s.block_detail_control.height,firstMusic=s.music_playing;
  const reader=s.conversation_detail,ground=s.player_grounding;
  if(reader.scroll_max>reader.scroll_page+1){
   const c=await page.locator('#canvas').boundingBox(),b=reader.control,cd=await context.newCDPSession(page),x=c.x+(b.x+b.width*.5)*c.width/s.viewport_width,y=c.y+(b.y+b.height*.85)*c.height/s.viewport_height;
   await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:41}]});
   for(let k=1;k<=5;k++)await cd.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-55*k/5,id:41}]});
   await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cd.detach();await settle();s=await snap();
   assert.ok(s.conversation_detail.scroll_value>reader.scroll_value,'actual finger reveals remaining16px Bea lines');assert.deepEqual(s.player_grounding,ground,'reading never walks the player');
  }else assert.ok(reader.scroll_page>=reader.scroll_max,'all fresh Bea words already fit without scrolling');

  const saved=await page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1')),legacy=await page.evaluate(()=>localStorage.getItem('tenderloin-redux.save.v1'));
  assert.ok(saved&&JSON.parse(saved).visited_neighbors.includes('bea'),'actual first Bea greeting creates original earned visit save');assert.equal(legacy,null,'fresh context has no legacy save; remains absent');
  await tap(s.conversation_detail.buttons[1]);s=await snap();assert.ok(s.phone_disclosure.actions_open&&s.conversation_actions.length>1);await page.keyboard.press('Escape');await settle();s=await snap();assert.ok(!s.phone_disclosure.actions_open&&s.block_panel_control.visible);
  await tap(s.conversation_detail.buttons[2]);s=await snap();assert.ok(s.controls_control.visible&&!s.phone_disclosure.tray.visible);assert.equal(s.walking_controls.filter(b=>b.visible).length,2);assert.ok(s.phone_disclosure.explore.visible);
  await tap(s.phone_disclosure.explore);s=await snap();assert.ok(s.phone_disclosure.tray.visible);assert.ok(s.walking_controls[1].visible&&s.walking_controls[2].visible&&s.walking_controls[3].visible&&s.walking_controls[4].visible);
  const pose=s.camera_pose,player=s.player_grounding;const cd=await context.newCDPSession(page),tr=s.phone_disclosure.tray,canvas=await page.locator('#canvas').boundingBox(),pt=(x,y,id)=>({x:canvas.x+x*canvas.width/s.viewport_width,y:canvas.y+y*canvas.height/s.viewport_height,id});await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pt(tr.x+2,tr.y+10,1),pt(tr.x+tr.width-2,tr.y+10,2)]});await cd.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[pt(tr.x+3,tr.y+12,1),pt(tr.x+tr.width-3,tr.y+12,2)]});await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settle();assert.deepEqual((await snap()).camera_pose,pose);assert.deepEqual((await snap()).player_grounding,player);await cd.detach();
  let z=(await snap()).camera_view_size;await tap((await snap()).walking_controls[3]);assert.ok((await snap()).camera_view_size<z);await tap((await snap()).walking_controls[4]);assert.ok((await snap()).camera_view_size>z*.8);
  await tap((await snap()).walking_controls[1]);s=await snap();assert.ok(!s.phone_disclosure.tray.visible&&s.walking_controls[0].text==='Back to Me');await tap(s.walking_controls[0]);assert.ok((await snap()).following_player);
  await tap((await snap()).phone_disclosure.explore);await page.keyboard.press('Escape');await settle();assert.ok(!(await snap()).phone_disclosure.tray.visible);
  await tap((await snap()).phone_disclosure.explore);await tap((await snap()).phone_disclosure.all_actions);s=await snap();assert.ok(s.block_panel_control.visible&&s.block_hub_actions.length===4&&!s.phone_disclosure.explore.visible&&!s.phone_disclosure.tray.visible,'actual All Actions opens original hub with no covering tray');
  await page.keyboard.press('Escape');await settle();assert.ok(!(await snap()).block_panel_control.visible,'one Escape closes hub opened from Explore');

  await tap((await snap()).walking_controls[5]);await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.block_panel_control.visible);await settle();s=await snap();assert.ok(!s.phone_disclosure.actions_open&&!s.phone_disclosure.transition,'Walk press/release cannot click through into the new talk row or leave a latched gesture');
  await tap(s.conversation_detail.buttons[1]);s=await snap();assert.equal(s.conversation_detail.buttons[5].text,'All Actions');await tap(s.conversation_detail.buttons[5]);s=await snap();assert.ok(s.block_hub_actions.length===4&&!s.phone_disclosure.actions_open,'talk-to-hub clears action disclosure ownership');await page.keyboard.press('Escape');await settle();assert.ok(!(await snap()).block_panel_control.visible,'one Escape closes hub after disclosed talk All Actions');
  await tap((await snap()).walking_controls[5]);await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.block_panel_control.visible);await settle();s=await snap();assert.ok(!s.phone_disclosure.actions_open&&!s.phone_disclosure.transition);await tap(s.conversation_detail.buttons[1]);s=await snap();assert.ok(s.conversation_detail.buttons[3].text.includes('Thanh'),'fresh Bea offers named Meet Thanh');await tap(s.conversation_detail.buttons[3]);await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.player_grounding.path_active);await tap((await snap()).walk_control);assert.ok(!(await snap()).player_grounding.path_active,'original primary Stop remains immediate after deliberate goal action');
  assert.equal((await snap()).music_playing,firstMusic,'phone disclosures retain Music preference');assert.equal(await page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1')),saved);assert.equal(await page.evaluate(()=>localStorage.getItem('tenderloin-redux.save.v1')),legacy);
  const result={size,freshBea:true,readerHeight:firstReaderHeight,actualFingerControls:true,legacyUnchanged:true};phoneDisclosureChecks.push(result);await writeFile(`artifacts/phone-disclosure-${size.width}x${size.height}.json`,JSON.stringify(result,null,2));await context.close();
 }
}

const mapPinchChecks=[];
async function verifyMapPinch(page,context,size){
  await page.setViewportSize(size);
  const snap=()=>page.evaluate(()=>window.__tenderloinGodotA11ySnapshot);
  const settle=async()=>{const f=(await snap()).ui_frame;await page.waitForFunction(f=>{const s=window.__tenderloinGodotA11ySnapshot;return s.ui_frame>f+3&&!s.layout_refit_pending;},f);};
  await page.keyboard.press('Escape');await page.keyboard.press('KeyF');await settle();
  const save=await page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1')),legacy=await page.evaluate(()=>localStorage.getItem('tenderloin-redux.save.v1'));
  const cdp=await context.newCDPSession(page),canvas=await page.locator('#canvas').boundingBox();
  let s=await snap();const rect=s.play_area,center={x:rect.x+rect.width*.5,y:rect.y+rect.height*.7};
  const point=(x,id,y=center.y)=>({x:canvas.x+x*canvas.width/s.viewport_width,y:canvas.y+y*canvas.height/s.viewport_height,id,radiusX:2,radiusY:2});
  const send=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
  const pose=x=>({x:x.player_grounding.x,z:x.player_grounding.z,path:x.player_grounding.path_active});
  const begin=async(left,right)=>{await send('touchStart',[point(center.x-left,1),point(center.x+right,2)]);await settle();};
  const move=async(from,to)=>{for(let i=1;i<=6;i++){const d=from+(to-from)*i/6;await send('touchMove',[point(center.x-d,1),point(center.x+d,2)]);await page.waitForTimeout(40);}await settle();};
  const before=await snap();assert.ok(before.following_player&&!before.player_grounding.path_active);
  await page.screenshot({path:`artifacts/map-pinch-${size.width}-before.png`});
  await begin(25,25);await move(25,60);const spread=await snap();
  assert.ok(spread.camera_view_size<before.camera_view_size,'actual two-finger spread zooms in');assert.equal(spread.following_player,before.following_player);assert.deepEqual(pose(spread),pose(before));
  // Installed Chrome155 ends the listed IDs (isolated DOM-event receipt retained).
  await send('touchEnd',[point(center.x-60,1)]);await settle();const one=await snap();assert.equal(one.map_pinch.contacts,1);
  await send('touchMove',[point(center.x+80,2)]);await settle();const held=await snap();
  assert.ok(held.map_pinch.blocked);assert.equal(held.camera_view_size,one.camera_view_size);assert.deepEqual(held.camera_pose,one.camera_pose);assert.deepEqual(pose(held),pose(before));
  await send('touchEnd',[]);await settle();assert.equal((await snap()).map_pinch.contacts,0);
  await begin(60,60);await move(60,15);const closed=await snap();assert.ok(closed.camera_view_size>spread.camera_view_size,'actual pinch closes to zoom out');
  await send('touchEnd',[]);await settle();
  await begin(25,25);await send('touchEnd',[point(center.x+25,2)]);await settle();const opposite=await snap();assert.equal(opposite.map_pinch.contacts,1);await send('touchMove',[point(center.x-40,1)]);await settle();assert.deepEqual((await snap()).camera_pose,opposite.camera_pose);await send('touchEnd',[]);await settle();
  // One-finger pan still hands camera ownership to the player after the gesture ends.
  await send('touchStart',[point(center.x,1)]);await send('touchMove',[point(center.x+20,1)]);await send('touchEnd',[]);await settle();
  const manual=await snap();assert.equal(manual.following_player,false);assert.deepEqual(pose(manual),pose(before));
  await begin(25,25);await move(25,50);const manualZoom=await snap();assert.ok(manualZoom.camera_view_size<manual.camera_view_size&&!manualZoom.following_player);assert.deepEqual(pose(manualZoom),pose(before));assert.ok(Math.hypot(manualZoom.map_pinch.anchor_screen.x-center.x,manualZoom.map_pinch.anchor_screen.y-center.y)<.1,'actual camera projects manual ground anchor back under initial centroid');
  await send('touchStart',[point(center.x-50,1),point(center.x+50,2),point(center.x,3)]);await settle();const extra=await snap();
  await send('touchMove',[point(center.x-35,1),point(center.x+35,2),point(center.x,3)]);await settle();assert.equal((await snap()).camera_view_size,extra.camera_view_size,'third contact held cancels pending zoom');
  await send('touchCancel',[]);await settle();assert.ok(!(await snap()).map_pinch.blocked);
  // Lifecycle cleanup is tested as a synthetic browser notification, not physical OS proof.
  await begin(25,25);await page.evaluate(()=>{window.dispatchEvent(new Event('pagehide'));window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});await settle();assert.equal((await snap()).map_pinch.contacts,0);await send('touchCancel',[]);
  await page.keyboard.press('F4');await settle();await page.waitForFunction(()=>!window.__tenderloinGodotA11ySnapshot.film_screening.layout_pending);await settle();let reader=await snap();assert.ok(reader.film_screening.visible);
  const rd=reader.film_screening.reader,rx=rd.x+rd.width*.5,ry=rd.y+rd.height*.35;
  await page.touchscreen.tap(canvas.x+rx*canvas.width/s.viewport_width,canvas.y+ry*canvas.height/s.viewport_height);await page.keyboard.press('End');await settle();
  const readerTrace=[{stage:'end',film:(await snap()).film_screening}];
  await send('touchStart',[point(rx,1,ry)]);await settle();
  for(let i=1;i<=4;i++){await send('touchMove',[point(rx,1,ry+i*2)]);await page.waitForTimeout(60);}
  await settle();const scroll1=(await snap()).film_screening.scroll;readerTrace.push({stage:'one',film:(await snap()).film_screening});
  await send('touchStart',[point(rx,1,ry+8),point(center.x,2,reader.film_screening.picture.y+15)]);await settle();
  for(let i=1;i<=5;i++){await send('touchMove',[point(rx,1,ry+8+i*4),point(center.x,2,reader.film_screening.picture.y+15)]);await page.waitForTimeout(60);}
  await settle();readerTrace.push({stage:'two',film:(await snap()).film_screening,map:(await snap()).map_pinch});await writeFile(`artifacts/map-pinch-reader-${size.width}.json`,JSON.stringify(readerTrace,null,2));
  assert.ok(scroll1<readerTrace[0].film.scroll,'one finger scroll precondition');assert.ok((await snap()).film_screening.scroll<scroll1,'refused map pinch still delivers raw drag to reader owner');assert.equal((await snap()).camera_view_size,reader.camera_view_size);await send('touchEnd',[]);await page.keyboard.press('Escape');await settle();
  await page.keyboard.press('F3');await settle();let circle=(await snap()).rhythm_circle;assert.ok(circle.visible);const view=circle.options[2];await page.touchscreen.tap(canvas.x+(view.x+view.width/2)*canvas.width/s.viewport_width,canvas.y+(view.y+view.height/2)*canvas.height/s.viewport_height);await settle();circle=(await snap()).rhythm_circle;assert.ok(circle.owns_view);
  const cr=circle.scene,cx=cr.x+cr.width*.5,cy=cr.y+cr.height*.5;
  await send('touchStart',[point(cx-15,1,cy),point(cx+15,2,cy)]);await send('touchMove',[point(cx-5,1,cy),point(cx+15,2,cy)]);await settle();assert.equal((await snap()).rhythm_circle.owns_view,false,'rhythm scene keeps its raw touch ownership');await send('touchEnd',[]);await settle();assert.equal((await snap()).rhythm_circle.dragging,false,'rhythm owner receives release');await page.keyboard.press('Escape');await settle();
  // Rotation cancels the active gesture without applying the old screen-space anchor.
  await begin(25,25);const rotationPose=(await snap()).camera_pose;await page.setViewportSize({width:size.width,height:size.height+1});await settle();assert.equal((await snap()).map_pinch.contacts,0);await send('touchCancel',[]);await page.setViewportSize(size);await settle();assert.deepEqual((await snap()).camera_pose,rotationPose);
  await writeFile(`artifacts/map-pinch-fallback-${size.width}.json`,JSON.stringify({beforeFindMe:(await snap()).camera_view_size,scope:'Rhythm framing may be below the global zoom clamp; establish ordinary follow view before checking relative fallback zoom direction.'},null,2));await page.keyboard.press('KeyF');await settle();
  s=await snap();if(s.phone_disclosure.enabled){const b=s.phone_disclosure.explore;assert.ok(b.visible);await page.touchscreen.tap(canvas.x+(b.x+b.width/2)*canvas.width/s.viewport_width,canvas.y+(b.y+b.height/2)*canvas.height/s.viewport_height);await settle();s=await snap();assert.ok(s.phone_disclosure.tray.visible);}
  assert.ok(s.camera_view_size>24,'ordinary follow view begins above minimum');const zoomOut=s.walking_controls.find(b=>b.visible&&b.text.includes('Zoom')&&!b.text.includes('+'));assert.ok(zoomOut);await page.touchscreen.tap(canvas.x+(zoomOut.x+zoomOut.width/2)*canvas.width/s.viewport_width,canvas.y+(zoomOut.y+zoomOut.height/2)*canvas.height/s.viewport_height);await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.camera_view_size>24,null,{timeout:10000});await settle();s=await snap();const zoom=s.walking_controls.find(b=>b.visible&&b.text.includes('Zoom')&&b.text.includes('+'));assert.ok(zoom);const z0=s.camera_view_size;assert.ok(z0>24,'fallback zoom test starts above minimum');
  await page.touchscreen.tap(canvas.x+(zoom.x+zoom.width/2)*canvas.width/s.viewport_width,canvas.y+(zoom.y+zoom.height/2)*canvas.height/s.viewport_height);await settle();assert.ok((await snap()).camera_view_size<z0,'existing Zoom + remains a working fallback');
  const ui=(await snap()).walking_controls.find(b=>b.visible&&b.text.includes('Zoom')&&b.text.includes('+'));
  const ux=ui.x+ui.width/2,uy=ui.y+ui.height/2,uiSize=(await snap()).camera_view_size;
  await send('touchStart',[point(ux,1,uy)]);await send('touchStart',[point(ux,1,uy),point(center.x,2)]);await send('touchMove',[point(ux,1,uy),point(center.x+20,2)]);await settle();assert.equal((await snap()).camera_view_size,uiSize,'UI-origin contacts do not become map pinch');await send('touchEnd',[]);await settle();
  assert.equal(await page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1')),save);assert.equal(await page.evaluate(()=>localStorage.getItem('tenderloin-redux.save.v1')),legacy);
  // Repeated real pinches reach a stable upper clamp; another gesture cannot exceed it.
  let previous=(await snap()).camera_view_size,maxObserved=previous,atMaximum=false;
  for(let i=0;i<7;i++){await begin(25,25);await move(25,10);await send('touchEnd',[]);await settle();maxObserved=(await snap()).camera_view_size;if(maxObserved===previous){atMaximum=true;break;}previous=maxObserved;}
  assert.ok(atMaximum&&maxObserved>=900,'actual repeated gestures reach the bounded maximum');
  await page.screenshot({path:`artifacts/map-pinch-${size.width}-after.png`});
  const result={size,actualTwoTouch:true,before:before.camera_view_size,spread:spread.camera_view_size,closed:closed.camera_view_size,manual:manualZoom.camera_view_size,playerDelta:Math.hypot(manualZoom.player_grounding.x-before.player_grounding.x,manualZoom.player_grounding.z-before.player_grounding.z),legacyUnchanged:(await page.evaluate(()=>localStorage.getItem('tenderloin-redux.save.v1')))===legacy,manualAnchor:manualZoom.map_pinch.anchor_screen,maxObserved};mapPinchChecks.push(result);await writeFile(`artifacts/map-pinch-${size.width}.json`,JSON.stringify(result,null,2));
  await page.keyboard.press('KeyF');await settle();s=await snap();const pa=s.play_area;const tx=Math.max(pa.x+10,s.player_screen.x-pa.width*.2),ty=Math.min(pa.y+pa.height-10,s.player_screen.y+pa.height*.2);
  await page.touchscreen.tap(canvas.x+tx*canvas.width/s.viewport_width,canvas.y+ty*canvas.height/s.viewport_height);await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.player_grounding.path_active,null,{timeout:4000});await page.keyboard.press('Escape');await settle();assert.equal((await snap()).player_grounding.path_active,false,'one-finger map tap starts a real route and Escape stops it after pinch/UI release');await cdp.detach();
}

const lanternProcessionChecks=[];
async function verifyLanternProcession(page,touch,size,privateFixture=false) {
 const encloses=(a,b)=>b.x>=a.x-1&&b.y>=a.y-1&&b.x+b.width<=a.x+a.width+1&&b.y+b.height<=a.y+a.height+1;
 const snap=()=>page.evaluate(()=>window.__tenderloinGodotA11ySnapshot),save=()=>page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1'));
 async function settle(){const f=(await snap()).ui_frame;await page.waitForFunction(f=>window.__tenderloinGodotA11ySnapshot.ui_frame>f+4,f);}
 async function tap(b){b=await revealPhoneControl(page,b,tap);const s=await snap(),c=await page.locator('#canvas').boundingBox();assert.ok(b&&b.visible!==false&&b.width>=44&&b.height>=44);const x=c.x+(b.x+b.width/2)*c.width/s.viewport_width,y=c.y+(b.y+b.height/2)*c.height/s.viewport_height;if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);await settle();}
 const before=await save(),legacy=await page.evaluate(()=>localStorage.getItem('tenderloin-redux.save.v1')),quiet=(await snap()).music_playing;
 await page.keyboard.press('F8');await settle();assert.ok((await snap()).power_story.visible);
 await tap((await snap()).power_story.more_entry);assert.ok((await snap()).story_picker.visible);
 await tap((await snap()).story_picker.entries[0]);let s=await snap();assert.ok(s.lantern_procession.visible&&s.lantern_procession.sites_valid);
 const pose=s.camera_pose;for(const b of s.lantern_procession.buttons)assert.ok(encloses({x:0,y:0,width:size.width,height:size.height},b));
 await tap(s.lantern_procession.buttons[1]);await tap((await snap()).lantern_procession.buttons[3]);await tap((await snap()).lantern_procession.buttons[4]);
 assert.ok((await snap()).lantern_procession.active);assert.deepEqual((await snap()).camera_pose,pose);
 for(let leg=0;leg<2;leg++){
  const start=(await snap()).lantern_procession.crew;
  await tap((await snap()).lantern_procession.buttons[5]);
  if(!(await snap()).lantern_procession.near)await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.player_grounding.path_active,null,{timeout:10000});
  if(leg===1){
   await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.lantern_procession.progress>12,null,{timeout:30000});
   s=await snap();assert.ok(s.lantern_procession.crew.every((p,i)=>Math.hypot(...p.position.map((v,j)=>v-start[i].position[j]))>3));
   await tap(s.walk_control);await settle();const held=(await snap()).lantern_procession.progress;await page.waitForTimeout(300);assert.equal((await snap()).lantern_procession.progress,held);assert.ok(!(await snap()).lantern_procession.traveling);
   await tap((await snap()).walk_control);await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.lantern_procession.visible);assert.ok((await snap()).lantern_procession.visible);await tap((await snap()).lantern_procession.buttons[5]);
  }
  await page.waitForFunction(()=>{const s=window.__tenderloinGodotA11ySnapshot;return s.lantern_procession.visible&&s.lantern_procession.near&&!s.player_grounding.path_active;},null,{timeout:90000});
  await tap((await snap()).lantern_procession.buttons[6]);
 }
 s=await snap();assert.ok(s.lantern_procession.won&&s.lantern_procession.progress>35&&s.lantern_procession.player_costume);
 await page.screenshot({path:`artifacts/lantern-${size.width}-${touch?'finger':'mouse'}.png`});
 assert.equal(await save(),before);assert.equal(s.music_playing,quiet);
 const final=s.lantern_procession;
 await tap(final.buttons[9]);await page.keyboard.press('KeyF');await settle();
 for(let i=0;i<3;i++)await tap((await snap()).walking_controls.find(b=>b.text.includes('Zoom')&&b.text.includes('+')));
 s=await snap();const q=s.lantern_procession.crew.flatMap(p=>p.corners),area=s.play_area,c=await page.locator('#canvas').boundingBox();
 const cx=q.reduce((a,p)=>a+p.x,0)/q.length,cy=q.reduce((a,p)=>a+p.y,0)/q.length,x=c.x+(area.x+area.width*.5)*c.width/s.viewport_width,y=c.y+(area.y+area.height*.5)*c.height/s.viewport_height;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+(area.x+area.width*.5-cx)*c.width/s.viewport_width,y+(area.y+area.height*.5-cy)*c.height/s.viewport_height,{steps:12});await page.mouse.up();await settle();
 // Real zoom refreshes the common cutaway after manual pan, as for other world-art inspections.
 await tap((await snap()).walking_controls.find(b=>b.text.includes('Zoom')&&b.text.includes('+')));s=await snap();
 assert.ok(s.lantern_procession.crew.every(p=>p.visible&&p.corners.every(q=>q.x>=0&&q.y>=0&&q.x<size.width&&q.y<size.height)),'both actual costume visitors project inside deliberate manual inspection');
 await page.screenshot({path:`artifacts/lantern-world-${size.width}-${touch?'finger':'mouse'}.png`});await writeFile(`artifacts/lantern-world-${size.width}-${touch?'finger':'mouse'}.json`,JSON.stringify({snapshot:s,sourceFingerprint},null,2));
 const inspection=s.camera_pose;await page.keyboard.press('F8');await settle();assert.deepEqual((await snap()).camera_pose,inspection);assert.ok((await snap()).lantern_procession.buttons[9].focused,'completed replay reader focuses enabled Back');
 await tap((await snap()).lantern_procession.buttons[7]);assert.ok(!(await snap()).lantern_procession.active);await tap((await snap()).lantern_procession.buttons[9]);
 await page.reload();await page.locator('#status').waitFor({state:'hidden',timeout:60000});await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.startup_pending);await page.keyboard.press('Escape');await settle();assert.ok(!(await snap()).lantern_procession.active);assert.equal(await save(),before);assert.equal(await page.evaluate(()=>localStorage.getItem('tenderloin-redux.save.v1')),legacy);
 const result={size,touch,privateFixture,progress:final.progress,route:final.route,crew:final.crew,sourceFingerprint};lanternProcessionChecks.push(result);await writeFile(`artifacts/lantern-${size.width}-${touch?'finger':'mouse'}.json`,JSON.stringify(result,null,2));
}

async function verifyDogStory(page,touch,size,privateFixture=false){
 const snap=()=>page.evaluate(()=>window.__tenderloinGodotA11ySnapshot),save=()=>page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1'));
 async function settle(){const f=(await snap()).ui_frame;await page.waitForFunction(f=>{const s=window.__tenderloinGodotA11ySnapshot;return s.ui_frame>f+3&&!s.layout_refit_pending&&!s.dog_story.layout_pending;},f);}
 async function tap(b,reader=false){b=await revealPhoneControl(page,b,tap);
  if(!touch&&size.width===1100&&!reader&&b?.text){let z=await snap(),index=z.dog_story.buttons.findIndex(x=>x.text===b.text);if(z.dog_story.visible&&index>=0){for(let n=0;n<18;n++){z=await snap();if(z.dog_story.buttons[index].focused)break;await page.keyboard.press('Tab');await settle();}assert.ok((await snap()).dog_story.buttons[index].focused,'real Tab reaches enabled named dog action');await page.keyboard.press('Space');await settle();return;}}const s=await snap(),c=await page.locator('#canvas').boundingBox();assert.ok(b?.visible&&!b.disabled&&b.width>=44&&b.height>=(reader?1:44),'actual dog action is visible/reachable44px');assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=s.viewport_width+1&&b.y+b.height<=s.viewport_height+1);const x=c.x+(b.x+b.width/2)*c.width/s.viewport_width,y=c.y+(b.y+b.height/2)*c.height/s.viewport_height;if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);await settle();}
 await page.setViewportSize(size);await settle();
 assert.ok(!(await snap()).power_story.active,'dog flow starts only after prior power story explicitly ended');
 const original=await save(),legacy=await page.evaluate(()=>localStorage.getItem('tenderloin-redux.save.v1')),initial=await snap(),quiet=[initial.music_playing,initial.music_mode,initial.music_volume,initial.reward_sounds_enabled];
 await page.keyboard.press('KeyG');await settle();await tap((await snap()).power_story.entry);assert.ok((await snap()).power_story.visible);assert.equal((await snap()).power_story.buttons.length,13,'gateway preserves original13 Power snapshot indices');await tap((await snap()).power_story.dogs_entry);
 let s=await snap();assert.ok(s.dog_story.visible&&!s.power_story.visible);const initialPose=s.camera_pose;assert.equal(s.dog_story.buttons.length,12);
 for(const b of s.dog_story.buttons)assert.ok(b.visible&&b.width>=44&&b.height>=44);
 await tap(s.dog_story.buttons[6]);assert.ok((await snap()).dog_story.buttons[3].focused,'Begin hands keyboard focus to enabled lead');assert.ok((await snap()).dog_story.active);assert.equal((await snap()).dog_story.lead,-1);assert.deepEqual((await snap()).camera_pose,initialPose);
 await tap((await snap()).dog_story.buttons[2]);assert.ok((await snap()).dog_story.text.includes('1419 Bryant')&&(await snap()).dog_story.text.includes('OUTSIDE'));await tap((await snap()).dog_story.reader,true);await page.keyboard.press('End');await settle();assert.ok((await snap()).dog_story.scroll>0,'actual source reader reaches scroll end');await tap((await snap()).dog_story.buttons[2]);
 const arrivals=[];
 async function walk(index,stop=false){
  await tap((await snap()).dog_story.buttons[3+index]);const start=(await snap()).player_grounding;await tap((await snap()).dog_story.buttons[7]);
  if(stop){await page.waitForFunction(p=>{const s=window.__tenderloinGodotA11ySnapshot;return s.player_grounding.path_active&&Math.hypot(s.player_grounding.x-p.x,s.player_grounding.z-p.z)>1;},start,{timeout:10000});await tap((await snap()).walking_controls.find(b=>b.text==='Stop Walking'));assert.ok(!(await snap()).dog_story.traveling&&!(await snap()).dog_story.visible);await tap((await snap()).walking_controls.find(b=>b.text==='Dog search'));assert.ok((await snap()).dog_story.visible,'same finger release cannot activate new Back');await tap((await snap()).dog_story.buttons[7]);}
  await page.waitForFunction(()=>{const s=window.__tenderloinGodotA11ySnapshot;return s.dog_story.visible&&s.dog_story.near&&!s.player_grounding.path_active;},null,{timeout:180000});await settle();const z=await snap(),g=z.dog_story.goals[index];assert.ok(Math.hypot(z.player_grounding.x-g[0],z.player_grounding.z-g[1])<2);arrivals.push([z.player_grounding.x,z.player_grounding.z]);
 }
 await walk(2,true);await tap((await snap()).dog_story.buttons[8]);assert.equal((await snap()).dog_story.found,0);assert.ok((await snap()).dog_story.text.includes('No missing dog'));
 for(const id of size.width===320?[1,0]:[0,1]){
  await tap((await snap()).dog_story.buttons[1-id]);await walk(id);const before=(await snap()).dog_story.found;
  await tap((await snap()).dog_story.buttons[8]);assert.equal((await snap()).dog_story.found,before);assert.ok((await snap()).dog_story.text.includes('differs'));assert.equal((await snap()).dog_story.scroll,0,'new comparison begins at readable top');
  await tap((await snap()).dog_story.buttons[id]);await tap((await snap()).dog_story.buttons[8]);assert.ok((await snap()).dog_story.found&(1<<id));assert.equal(await save(),original);
 }
 assert.ok(!(await snap()).dog_story.won&&!(await snap()).dog_story.owners_visible);await walk(2);await tap((await snap()).dog_story.buttons[8]);s=await snap();assert.ok(s.dog_story.won&&s.dog_story.owners_visible&&s.dog_story.text.startsWith('Two dogs home!'));assert.equal(await save(),original);
 await page.screenshot({path:`artifacts/dogs-reunion-${size.width}-${touch?'finger':'mouse'}.png`});
 // Actual Close, manual drag and focused rotation retain camera and zero-write state.
 await tap(s.dog_story.buttons[11]);await page.keyboard.press('KeyF');await settle();for(let i=0;i<4;i++)await tap((await snap()).walking_controls.find(b=>b.text.includes('Zoom')&&b.text.includes('+')));
 {const z=await snap(),r=z.play_area,c=await page.locator('#canvas').boundingBox(),x=c.x+(r.x+r.width*.5)*c.width/z.viewport_width,y=c.y+(r.y+r.height*.6)*c.height/z.viewport_height;if(touch){const cd=await page.context().newCDPSession(page);await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:0}]});for(let k=1;k<=4;k++)await cd.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+24*k/4,y,id:0}]});await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cd.detach();}else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+24,y,{steps:4});await page.mouse.up();}}
 await settle();
 for(let n=0;n<12;n++){
  const z=await snap(),q=z.dog_story.world[0].corners,r=z.play_area,c=await page.locator('#canvas').boundingBox(),cx=q.reduce((a,p)=>a+p.x,0)/4,cy=q.reduce((a,p)=>a+p.y,0)/4,dx=Math.max(-r.width*.3,Math.min(r.width*.3,r.x+r.width*.5-cx)),dy=Math.max(-r.height*.3,Math.min(r.height*.3,r.y+r.height*.55-cy));
  if(Math.hypot(dx,dy)<12)break;
  const x=c.x+(r.x+r.width*.5)*c.width/z.viewport_width,y=c.y+(r.y+r.height*.5)*c.height/z.viewport_height;
  if(touch){const cd=await page.context().newCDPSession(page);await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:0}]});for(let k=1;k<=5;k++)await cd.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*k/5*c.width/z.viewport_width,y:y+dy*k/5*c.height/z.viewport_height,id:0}]});await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cd.detach();}else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx*c.width/z.viewport_width,y+dy*c.height/z.viewport_height,{steps:5});await page.mouse.up();}await settle();
 }
 const inspect=await snap(),canvas=await page.locator('#canvas').boundingBox(),beforeWorld=screenshotPixels(await page.screenshot()),bodyPoints=inspect.dog_story.world[0].body_points;
 for(const point of inspect.dog_story.world[0].corners)assert.ok(point.x>=inspect.play_area.x&&point.y>=inspect.play_area.y&&point.x<=inspect.play_area.x+inspect.play_area.width&&point.y<=inspect.play_area.y+inspect.play_area.height,'actual dog body fully in deliberate manual inspection');
 const bodyColors=bodyPoints.map(p=>beforeWorld.pixel(canvas.x+p.x*canvas.width/inspect.viewport_width,canvas.y+p.y*canvas.height/inspect.viewport_height));assert.ok(bodyColors.filter(([r,g,b])=>r>50&&r-g>15&&r-b>25).length>=3,'actual original rust dog renders warm coat pixels, not only metadata/owner');await page.screenshot({path:`artifacts/dogs-world-${size.width}-${touch?'finger':'mouse'}-reunion.png`});
 const pose=(await snap()).camera_pose;assert.equal((await snap()).following_player,false);await page.keyboard.press('F8');await settle();assert.ok((await snap()).dog_story.visible&&!(await snap()).power_story.visible,'gateway resumes active dog without overlapping Power');
 const grounded=(await snap()).player_grounding;await page.keyboard.down('KeyW');await page.waitForTimeout(140);await page.keyboard.up('KeyW');await settle();assert.deepEqual([(await snap()).player_grounding.x,(await snap()).player_grounding.z],[grounded.x,grounded.z]);
 for(const boundary of [{width:559,height:360},{width:320,height:667},size]){await page.setViewportSize(boundary);await settle();const z=await snap();assert.deepEqual(z.camera_pose,pose);for(const b of z.dog_story.buttons)assert.ok(b.width>=44&&b.height>=44&&b.x>=0&&b.y>=0&&b.x+b.width<=boundary.width+1&&b.y+b.height<=boundary.height+1);}
 assert.deepEqual([(await snap()).music_playing,(await snap()).music_mode,(await snap()).music_volume,(await snap()).reward_sounds_enabled],quiet);await tap((await snap()).dog_story.buttons[9]);assert.ok(!(await snap()).dog_story.active&&!(await snap()).dog_story.owners_visible);assert.equal(await save(),original);await tap((await snap()).dog_story.buttons[11]);await settle();assert.deepEqual((await snap()).camera_pose,pose);const afterWorld=screenshotPixels(await page.screenshot());const changedBody=bodyPoints.filter((p,i)=>afterWorld.pixel(canvas.x+p.x*canvas.width/size.width,canvas.y+p.y*canvas.height/size.height).some((v,k)=>Math.abs(v-bodyColors[i][k])>25)).length;assert.ok(changedBody>=3,'End actually removes rendered dog at exact manual pose');await page.screenshot({path:`artifacts/dogs-world-${size.width}-${touch?'finger':'mouse'}-ended.png`});await page.keyboard.press('F8');await settle();assert.ok((await snap()).power_story.visible&&!(await snap()).dog_story.visible);await page.keyboard.press('Escape');await settle();
 await page.reload();await page.locator('#status').waitFor({state:'hidden',timeout:60000});await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.startup_pending);await page.keyboard.press('Escape');await settle();assert.ok(!(await snap()).dog_story.active&&!(await snap()).dog_story.visible);assert.equal(await save(),original);assert.equal(await page.evaluate(()=>localStorage.getItem('tenderloin-redux.save.v1')),legacy);
 const result={...size,touch,privateFixture,arrivals,ownersVisibleAtReunion:s.dog_story.owners_visible,world:s.dog_story.world,bodyColors,changedBody,sourceFingerprint};dogStoryChecks.push(result);await writeFile(`artifacts/dogs-${size.width}-${touch?'finger':'mouse'}.json`,JSON.stringify(result,null,2));
}


const programmeStudioChecks=[];
async function verifyProgrammeStudio(page,touch,size,preHost=false){
  const snap=()=>page.evaluate(()=>window.__tenderloinGodotA11ySnapshot),save=()=>page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1'));
  const settle=async()=>{const f=(await snap()).ui_frame;await page.waitForFunction(f=>{const s=window.__tenderloinGodotA11ySnapshot;return s.ui_frame>f+4&&!s.layout_refit_pending&&!s.programme_studio.layout_pending;},f);};
  async function tap(b,reading=false){b=await revealPhoneControl(page,b,tap);assert.ok(b?.visible&&b.width>=44&&b.height>=(reading?1:44)&&!b.disabled,'actual named Programme target');const s=await snap(),c=await page.locator('#canvas').boundingBox(),x=c.x+(b.x+b.width/2)*c.width/s.viewport_width,y=c.y+(b.y+b.height/2)*c.height/s.viewport_height;if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);await settle();}
  const legacyBefore=await page.evaluate(()=>localStorage.getItem('tenderloin-redux.save.v1'));
  await page.setViewportSize(size);await settle();if((await snap()).story_detail.panel.visible){await page.keyboard.press('Escape');await settle();}
  // Actual deliberate scene drag owns the pose before opening or rotating the Studio.
  if((await snap()).block_panel_control.visible){await page.keyboard.press('KeyG');await settle();}
  {const s=await snap(),r=s.play_area,c=await page.locator('#canvas').boundingBox(),x=c.x+(r.x+r.width*.35)*c.width/s.viewport_width,y=c.y+(r.y+r.height*.55)*c.height/s.viewport_height,dx=Math.min(80,r.width*.3)*c.width/s.viewport_width;
   if(touch){const cd=await page.context().newCDPSession(page);await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});for(let i=1;i<=5;i++)await cd.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/5,y,id:1}]});await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cd.detach();}
   else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y,{steps:5});await page.mouse.up();}await settle();assert.equal((await snap()).following_player,false,'real scene inspection owns programme pose');}
  await page.keyboard.press('KeyG');await settle();let entry;
  for(let p=0;p<3;p++){entry=(await snap()).block_hub_actions.find(b=>b.visible&&/Plan .*Schedule|Start Hosting|Hosted All/.test(b.text));if(entry)break;await tap((await snap()).block_page_next);}
  const initial=await snap(),pose=initial.camera_pose,quiet=[initial.music_playing,initial.music_volume,initial.music_mode,initial.reward_sounds_enabled],before=JSON.parse(await save()),photo=JSON.stringify(before.epilogue.photo),host=JSON.stringify(before.hosting),beforeRaw=await save();
  await tap(entry);assert.ok((await snap()).programme_studio.visible);assert.equal(await save(),beforeRaw,'opening never fills or writes draft');assert.deepEqual((await snap()).programme_studio.pitches,SEGMENTS.map(s=>s.pitch));
  if(before.programme.published.length===0){assert.equal((await snap()).programme_studio.buttons[7].text,'Post');assert.ok((await snap()).programme_studio.buttons[7].disabled,'partial first draft cannot post before all proposals fit');}
  for(let i=0;i<4;i++){await tap((await snap()).programme_studio.buttons[i]);if((await snap()).programme_studio.draft.includes(SEGMENTS[i].id))await tap((await snap()).programme_studio.buttons[4]);}
  for(const i of [1,0,2,3]){await tap((await snap()).programme_studio.buttons[i]);await tap((await snap()).programme_studio.buttons[4]);}
  let h=(await snap()).programme_studio;assert.ok(h.buttons[7].disabled&&/between/.test(h.issue),'quiet-interval reason blocks invalid Post');
  const oldInk=screenshotPixels(await page.screenshot());await tap(h.buttons[5]);
  if(!touch){await page.keyboard.press('Space');await settle();}else await tap((await snap()).programme_studio.buttons[5]);
  assert.deepEqual((await snap()).programme_studio.draft,['beats','pause','stories','art']);
  if(!preHost&&before.programme.published.join()!==['art','beats','pause','stories'].join()){await tap((await snap()).programme_studio.buttons[2]);for(let i=0;i<3;i++)await tap((await snap()).programme_studio.buttons[5]);assert.ok((await snap()).programme_studio.buttons[5].disabled,'Earlier disables at first card');}
  h=(await snap()).programme_studio;const newInk=screenshotPixels(await page.screenshot()),canvas=await page.locator('#canvas').boundingBox();let changed=0;
  for(let y=h.picture.y+2;y<h.picture.y+h.picture.height-2;y+=3)for(let x=h.picture.x+2;x<h.picture.x+h.picture.width-2;x+=3){const px=canvas.x+x*canvas.width/size.width,py=canvas.y+y*canvas.height/size.height;if(oldInk.pixel(px,py).some((v,k)=>Math.abs(v-newInk.pixel(px,py)[k])>30))changed++;}assert.ok(changed>=20,'actual pinboard pixels reorder with proposals');
  await tap(h.buttons[7]);h=(await snap()).programme_studio;assert.ok(h.posted_view);assert.deepEqual(h.replies,['bea','dez','celeste','thanh'].map(id=>programmeResponse(id,h.published)),'all four replies match original authored browser source');
  for(const b of [h.top,h.tray,h.picture,...h.buttons])assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=size.width+1&&b.y+b.height<=size.height+1,'full named programme controls and art inside viewport');
  const stable=await save();await tap(h.reader,true);await page.keyboard.press('End');await settle();let end=(await snap()).programme_studio;assert.ok(end.scroll_max>0&&Math.abs(end.scroll-end.scroll_max)<=1,'actual End reaches all complete resident replies');
  if(touch){const s=await snap(),r=end.reader,c=await page.locator('#canvas').boundingBox(),x=c.x+(r.x+r.width*.6)*c.width/s.viewport_width,y=c.y+(r.y+6)*c.height/s.viewport_height,dy=(r.height-12)*c.height/s.viewport_height,cd=await page.context().newCDPSession(page);await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});for(let i=1;i<=5;i++)await cd.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+dy*i/5,id:1}]});await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cd.detach();}
  else{await page.mouse.move(end.reader.x+end.reader.width*.5,end.reader.y+end.reader.height*.5);await page.mouse.wheel(0,-180);}await settle();assert.ok((await snap()).programme_studio.scroll<end.scroll,'actual finger/wheel reads back');assert.equal(await save(),stable);
  await page.keyboard.down('KeyW');await page.waitForTimeout(200);await page.keyboard.up('KeyW');await settle();assert.equal((await snap()).player_grounding.x,initial.player_grounding.x);assert.equal((await snap()).player_grounding.z,initial.player_grounding.z);
  await page.screenshot({path:`artifacts/programme-studio-posted-${size.width}-${touch?'finger':'mouse'}-${preHost?'first':'future'}.png`});
  for(const boundary of [{width:320,height:568},{width:520,height:360},size]){await page.setViewportSize(boundary);await settle();const p=(await snap()).programme_studio;for(const b of [p.top,p.tray,p.picture,...p.buttons])assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=boundary.width+1&&b.y+b.height<=boundary.height+1,'open rotation keeps all programme controls reachable');assert.deepEqual((await snap()).camera_pose,pose);}
  await page.setViewportSize(size);await settle();assert.deepEqual([(await snap()).music_playing,(await snap()).music_volume,(await snap()).music_mode,(await snap()).reward_sounds_enabled],quiet);
  if(preHost){await tap((await snap()).programme_studio.buttons[8]);await tap((await snap()).programme_studio.buttons[2]);await tap((await snap()).programme_studio.buttons[4]);assert.ok((await snap()).programme_studio.buttons[7].disabled,'incomplete revision stays separate');await tap((await snap()).programme_studio.buttons[8]);assert.equal((await snap()).programme_studio.buttons[7].text,'Start hosting');assert.ok(!(await snap()).programme_studio.buttons[7].disabled,'Posted copy remains startable with a partial revision');await tap((await snap()).programme_studio.buttons[7]);assert.ok(!(await snap()).programme_studio.visible);assert.deepEqual(JSON.parse(await save()).hosting.order,['beats','pause','stories','art'],'genuine actual Start Hosting copies nondefault Studio order');assert.match((await snap()).block_detail_text,/We're hosting 1\/4/,'original wrapper introduces actual hosted order');}
  else{assert.equal(JSON.stringify(JSON.parse(await save()).hosting),host,'future revision preserves exact copied hosting results');assert.equal((await snap()).sparks,initial.sparks);await tap((await snap()).programme_studio.buttons[10]);assert.deepEqual((await snap()).camera_pose,pose,'actual Back keeps deliberate manual view');await page.keyboard.press('F6');await settle();assert.equal(await save(),stable);await page.keyboard.press('Escape');await settle();assert.ok(!(await snap()).programme_studio.visible);assert.deepEqual((await snap()).camera_pose,pose);await page.reload();await page.locator('#status').waitFor({state:'hidden',timeout:60000});await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.startup_pending);await page.keyboard.press('Escape');await settle();assert.equal(await save(),stable,'reload restores distinct draft/posted/hosting copies with no write');}
  assert.equal(await page.evaluate(()=>localStorage.getItem('tenderloin-redux.save.v1')),legacyBefore);assert.equal(JSON.stringify(JSON.parse(await save()).epilogue.photo),photo);programmeStudioChecks.push({width:size.width,height:size.height,touch,preHost,partialBeforePost:before.programme.published.length===0&&before.programme.order.length>0,changed,published:h.published,hostCopyUnchanged:!preHost});
}

async function verifyCivicListening(page,touch,size,readOnly=false) {
  const snap=()=>page.evaluate(()=>window.__tenderloinGodotA11ySnapshot),save=()=>page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1'));
  async function settle(){const f=(await snap()).ui_frame;await page.waitForFunction(f=>{const s=window.__tenderloinGodotA11ySnapshot;return s.ui_frame>f+3&&!s.civic_listening.layout_pending&&!s.layout_refit_pending;},f);}
  async function tap(b,reading=false){b=await revealPhoneControl(page,b,tap);const s=await snap(),c=await page.locator('#canvas').boundingBox();assert.ok(b.visible&&!b.disabled&&b.width>=44&&b.height>=(reading?1:44)&&b.x>=0&&b.y>=0&&b.x+b.width<=s.viewport_width+1&&b.y+b.height<=s.viewport_height+1,'Listening Hour control on screen');const x=c.x+(b.x+b.width/2)*c.width/s.viewport_width,y=c.y+(b.y+b.height/2)*c.height/s.viewport_height;if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);await settle();}
  await settle();if((await snap()).story_detail.panel.visible)await page.keyboard.press('Escape');
  if(!(await snap()).block_panel_control.visible)await page.keyboard.press('KeyG');await settle();
  const original=await save(),photo=JSON.stringify(JSON.parse(original).epilogue.photo),initial=await snap(),pose=initial.camera_pose;
  const overlap=(a,b)=>a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height;
  for(const b of [initial.civic_listening.entry,initial.block_close_control,initial.block_page_previous,initial.block_page_next].filter(b=>b.visible))for(const w of initial.walking_controls.filter(b=>b.visible))assert.ok(!overlap(b,w),'Listening entry and hub navigation clear every walking button');
  await tap(initial.civic_listening.entry);assert.equal(await save(),original,'opening never writes or starts civic hour');
  if(!readOnly){
    await tap((await snap()).civic_listening.buttons[9]);assert.equal((await snap()).civic_listening.phase,'planning');
    for(let category=0;category<3;category++){
      await tap((await snap()).civic_listening.buttons[category]);
      await tap((await snap()).civic_listening.buttons[4]);
      let h=(await snap()).civic_listening;
      assert.equal(h.plan[['topic','format','notes'][category]],['access','dropin','none'][category]);
      for(const b of h.buttons.filter(b=>b.visible))assert.ok(b.width>=44&&b.height>=44);
    }
    await tap((await snap()).civic_listening.buttons[2]);
    const without=screenshotPixels(await page.screenshot());
    await tap((await snap()).civic_listening.buttons[3]);
    let h=(await snap()).civic_listening;const withNotes=screenshotPixels(await page.screenshot()),rect=h.picture,c=await page.locator('#canvas').boundingBox(),vp=await snap();let changed=0;
    for(let y=rect.y+2;y<rect.y+rect.height-2;y+=2)for(let x=rect.x+2;x<rect.x+rect.width-2;x+=2){const px=c.x+x*c.width/vp.viewport_width,py=c.y+y*c.height/vp.viewport_height;if(without.pixel(px,py).some((v,k)=>Math.abs(v-withNotes.pixel(px,py)[k])>24))changed++;}
    assert.ok(changed>=20,'actual notes choice changes rendered illustration ink');
    if(size.width<600){await tap((await snap()).civic_listening.buttons[4]);}
    const s=await snap(),pos=[s.player_grounding.x,s.player_grounding.z],muted=s.music_playing;
    await page.keyboard.down('KeyW');await page.waitForTimeout(200);await page.keyboard.up('KeyW');await settle();assert.deepEqual([(await snap()).player_grounding.x,(await snap()).player_grounding.z],pos,'held W cannot move under civic view');assert.equal((await snap()).music_playing,muted);
    await page.screenshot({path:`artifacts/listening-planning-${size.width}-${touch?'finger':'mouse'}.png`});
    if(!touch){
      await tap((await snap()).civic_listening.buttons[3]);await page.keyboard.press('Tab');await page.keyboard.press('Space');await settle();assert.equal((await snap()).civic_listening.plan.notes,'none','real Tab Space changes actual named notes option');
      await tap((await snap()).civic_listening.buttons[3]);
    }
    await tap((await snap()).civic_listening.buttons[9]);assert.equal((await snap()).civic_listening.phase,'meeting');
  }
  const stable=await save(),h=(await snap()).civic_listening;
  assert.deepEqual(h.dialogue,civicConversation(h.plan).map(x=>x.text),'actual reader script exactly mirrors project-native four authored voices');
  for(let i=0;i<4;i++){await tap((await snap()).civic_listening.buttons[5+i]);let v=(await snap()).civic_listening;assert.match(v.text,new RegExp(['Bea','Thanh','Celeste','Dez'][i]+':'));assert.ok(v.text.includes(civicConversation(v.plan)[i].text));assert.equal(await save(),stable,'reading turns writes no result/photo/progress');}
  await tap((await snap()).civic_listening.reader,true);await page.keyboard.press('End');await settle();let end=(await snap()).civic_listening;assert.ok(end.scroll>0&&end.scroll>=end.scroll_max-end.scroll_page-2,'End reads final complete civic line');
  if(touch){const c=await page.locator('#canvas').boundingBox(),r=end.reader,session=await page.context().newCDPSession(page),x=c.x+(r.x+r.width*.6)*c.width/(await snap()).viewport_width,y=c.y+(r.y+r.height*.35)*c.height/(await snap()).viewport_height;await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});for(let dy=10;dy<=38;dy+=7)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+dy,id:1}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();}
  else{const c=await page.locator('#canvas').boundingBox(),r=end.reader;await page.mouse.move(c.x+r.x+r.width*.5,c.y+r.y+r.height*.5);await page.mouse.wheel(0,-200);}await settle();assert.ok((await snap()).civic_listening.scroll<end.scroll,'actual finger/wheel reads back');
  await page.screenshot({path:`artifacts/listening-voices-${size.width}-${touch?'finger':'mouse'}-${readOnly?'remember':'meeting'}.png`});
  if(!readOnly){
    await tap((await snap()).civic_listening.buttons[11]);assert.ok((await snap()).civic_listening.entry_focused,'meeting Back restores actual entry focus');assert.equal(await save(),stable);
    await page.keyboard.press('F5');await settle();await page.keyboard.press('Escape');await settle();assert.ok((await snap()).civic_listening.entry_focused,'meeting Escape restores actual entry focus');
    await page.keyboard.press('F5');await settle();await tap((await snap()).civic_listening.buttons[9]);assert.equal((await snap()).civic_listening.phase,'done');
  }
  const done=await save();assert.equal(JSON.stringify(JSON.parse(done).epilogue.photo),photo);
  const top=(await snap()).civic_listening.top;assert.ok(top.x>=0&&top.y>=0&&top.x+top.width<=size.width&&top.y+top.height<=size.height,'complete wrapped heading stays on screen');
  const oldSize={...size};await page.setViewportSize({width:520,height:360});await settle();for(const b of (await snap()).civic_listening.buttons.filter(b=>b.visible))assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=520&&b.y+b.height<=360);
  await page.setViewportSize(oldSize);await settle();assert.deepEqual((await snap()).camera_pose,pose,'focused resize preserves exact camera');
  await tap((await snap()).civic_listening.buttons[11]);assert.equal((await snap()).civic_listening.visible,false);
  if((await snap()).story_detail.panel.visible){await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.story_start_focus,null,{timeout:2000});assert.ok((await snap()).story_start_focus,'newly unlocked film chapter deliberately owns focus');await page.keyboard.press('Escape');await settle();}
  else assert.ok((await snap()).civic_listening.entry_focused,'real Back restores entry focus');
  assert.equal(await save(),done);
  await page.keyboard.press('F5');await settle();assert.equal((await snap()).civic_listening.visible,true,'real F5 opens re-read without browser reload');assert.equal(await save(),done);await page.keyboard.press('Escape');await settle();assert.equal((await snap()).civic_listening.visible,false);assert.ok((await snap()).civic_listening.entry_focused,'real Escape restores entry focus');assert.equal(await save(),done);
  civicListeningChecks.push({width:size.width,height:size.height,touch,readOnly,plan:h.plan});
  await writeFile(`artifacts/listening-${size.width}-${touch?'finger':'mouse'}-${readOnly?'remember':'active'}.json`,JSON.stringify({plan:h.plan,readOnly,photoUnchanged:true,dialogueParity:true,camera:(await snap()).camera_pose},null,2));
}

async function verifyBeaInvitation(page,touch,size,worldProof=false) {
  const snap=()=>page.evaluate(()=>window.__tenderloinGodotA11ySnapshot),save=()=>page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1'));
  async function settle(){const f=(await snap()).ui_frame;await page.waitForFunction(f=>{const s=window.__tenderloinGodotA11ySnapshot;return s.ui_frame>f+3&&!s.layout_refit_pending&&!s.compact_panel_layout_pending;},f);}
  async function tap(b,reading=false){b=await revealPhoneControl(page,b,tap);let s=await snap(),c=await page.locator('#canvas').boundingBox();assert.ok(b.visible&&b.width>=44&&b.height>=(reading?1:44)&&b.x>=0&&b.y>=0&&b.x+b.width<=s.viewport_width+1&&b.y+b.height<=s.viewport_height+1,'invitation button reachable');const x=c.x+(b.x+b.width/2)*c.width/s.viewport_width,y=c.y+(b.y+b.height/2)*c.height/s.viewport_height;if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);await settle();}
  await settle();if((await snap()).story_detail.panel.visible)await page.keyboard.press('Escape');
  if(!(await snap()).block_panel_control.visible)await page.keyboard.press('KeyG');await settle();
  assert.equal((await snap()).hosting_current,'stories');
  const legacy=await page.evaluate(()=>localStorage.getItem('tenderloin-redux.save.v1'));
  const initial=JSON.parse(await save()),photo=JSON.stringify(initial.epilogue.photo),music=(await snap()).music_playing,pose=(await snap()).camera_pose;
  for(const [id,i] of [['future',1],['memory',0]]){
    await tap((await snap()).quiet_seats.buttons[i]);let s=await snap(),b=s.bea_invitation;
    assert.ok(s.quiet_seats.buttons.every(b=>b.text_fits),'all full invitation titles fit');assert.equal(b.choice,id);assert.ok(s.quiet_seats.buttons[i].selected);assert.equal(s.quiet_seats.buttons[i].accessible_name,STORY_CHOICES[id]+' , selected');assert.equal(JSON.parse(await save()).hosting.draft.story,id);
    assert.match(s.block_detail_text,id==='memory'?/folded note/:/paper flags/);assert.match(s.block_detail_text,/listening is equally welcome/);assert.equal(JSON.stringify(JSON.parse(await save()).epilogue.photo),photo);assert.equal(s.music_playing,music);assert.deepEqual(s.camera_pose,pose);
  }
  if(!touch){await page.keyboard.press('Tab');await page.keyboard.press('Space');await settle();assert.equal((await snap()).bea_invitation.choice,'future','actual Tab Space selects invitation');await page.keyboard.press('Shift+KeyZ');await settle();assert.equal((await snap()).bea_invitation.choice,'memory');}
  await page.keyboard.press('Shift+KeyZ');await settle();assert.equal((await snap()).bea_invitation.choice,'future');assert.match(await page.locator('#godot-a11y-status').textContent(),/Something you hope to make together/);
  const reader=(await snap()).block_detail_control;await tap(reader,true);await page.keyboard.press('End');await settle();let s=await snap();assert.ok(s.block_detail_scroll_value>0&&s.block_detail_scroll_value+s.block_detail_scroll_page>=s.block_detail_scroll_max-2,'complete Bea example readable to its end');
  if(touch){const c=await page.locator('#canvas').boundingBox(),x=c.x+(reader.x+reader.width/2)*c.width/s.viewport_width,y=c.y+(reader.y+reader.height/2)*c.height/s.viewport_height,cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+25,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
  else{const c=await page.locator('#canvas').boundingBox();await page.mouse.move(c.x+(reader.x+reader.width/2)*c.width/s.viewport_width,c.y+(reader.y+reader.height/2)*c.height/s.viewport_height);await page.mouse.wheel(0,-200);}await settle();assert.ok((await snap()).block_detail_scroll_value<s.block_detail_scroll_value,'actual wheel/finger reads full invitation');
  await page.screenshot({path:`artifacts/invitation-controls-${size.width}x${size.height}-${touch?'finger':'mouse'}.png`});
  // Leave the genuine representative flow on its original memory choice.
  await tap((await snap()).quiet_seats.buttons[0]);
  let changed=0,paperPixels=0,inkPixels=0;
  if(worldProof){
    await tap((await snap()).block_close_control);
    const fixedPlayer=(await snap()).player_grounding;
    await tap((await snap()).walking_controls.find(b=>b.text.includes('Find Me')));
    for(let i=0;i<4;i++)await tap((await snap()).walking_controls.find(b=>b.text.includes('Zoom')&&b.text.includes('+')));
    for(let i=0;i<14;i++){
      const s=await snap(),p=s.bea_invitation.paper,r=s.play_area,c=await page.locator('#canvas').boundingBox(),dx=Math.max(-s.viewport_width*.35,Math.min(s.viewport_width*.35,r.x+r.width*.5-p.x-p.width*.5)),dy=Math.max(-s.viewport_height*.15,Math.min(s.viewport_height*.15,r.y+r.height*.5-p.y-p.height*.5));if(Math.hypot(dx,dy)<=10)break;
      const x=c.x+(r.x+r.width*.5)*c.width/s.viewport_width,y=c.y+(r.y+r.height*.5)*c.height/s.viewport_height;
      if(touch){const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});for(let k=1;k<=8;k++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*k/8,y:y+dy*k/8,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
      else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:8});await page.mouse.up();}await settle();
    }
    const a=await snap(),r=a.bea_invitation.paper,c=await page.locator('#canvas').boundingBox(),pixels=screenshotPixels(await page.screenshot()),inspection=a.camera_pose;
    assert.equal(a.player_grounding.x,fixedPlayer.x);assert.equal(a.player_grounding.z,fixedPlayer.z);
    const texelChecks=[];
    const checkTexels=(ss,pix)=>{const checks=ss.bea_invitation.paper_samples.map(q=>{const rgb=q.color.match(/../g).map(h=>parseInt(h,16)),x=c.x+q.x*c.width/ss.viewport_width,y=c.y+q.y*c.height/ss.viewport_height;let error=Infinity,actual;for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++){const color=pix.pixel(x+xx,y+yy),d=color.reduce((n,v,k)=>n+Math.abs(v-rgb[k]),0);if(d<error){error=d;actual=color;}}return {u:q.u,v:q.v,expected:rgb,actual,error};});texelChecks.push({choice:ss.bea_invitation.choice,checks});};
    checkTexels(a,pixels);
    const guide=a.overlays.guide_label;assert.ok(!guide.visible||guide.x+guide.width<=r.x-4||guide.x>=r.x+r.width+4||guide.y+guide.height<=r.y-4||guide.y>=r.y+r.height+4,'actual guidance caption leaves the inspected paper clear');

    assert.ok(!a.following_player&&r.width>=10&&r.height>=10&&r.x>=0&&r.y>a.header_control.y+a.header_control.height&&r.x+r.width<a.viewport_width&&r.y+r.height<a.viewport_height-100,'actual standing paper visible at deliberate manual inspection');
    await page.screenshot({path:`artifacts/invitation-world-memory-${size.width}x${size.height}-${touch?'finger':'mouse'}-${initial.gathering_layout}.png`});
    await page.keyboard.press('KeyG');await settle();await tap((await snap()).quiet_seats.buttons[1]);await tap((await snap()).block_close_control);await settle();assert.deepEqual((await snap()).camera_pose,inspection,'selection and Close preserve exact manual inspection');const next=screenshotPixels(await page.screenshot());checkTexels(await snap(),next);
    // Real cutaway buildings remain as translucent foreground geometry. They tint
    // unshaded paper too. Mip filtering and overlapping cutaway faces can tint each UV differently.
    // Both known artwork changes must retain every palette-channel direction
    // and meaningful contrast; the third unchanged UV stays still. Blank or
    // scenery-only masks cannot pass both opposed palette transitions.
    const linear=v=>v<=10.31475?v/3294.6:Math.pow((v/255+0.055)/1.055,2.4),deltas=[];
    assert.equal(texelChecks.length,2);assert.ok(texelChecks.every(x=>x.checks.length===3));
    for(let point=0;point<2;point++)for(let channel=0;channel<3;channel++){const before=texelChecks[0].checks[point],after=texelChecks[1].checks[point],expected=linear(after.expected[channel])-linear(before.expected[channel]),observed=linear(after.actual[channel])-linear(before.actual[channel]);assert.ok(expected*observed>0,'both original palette transitions retain every channel direction');deltas.push({expected,observed});}
    const transmission=deltas.reduce((n,x)=>n+x.expected*x.observed,0)/deltas.reduce((n,x)=>n+x.expected*x.expected,0),residual=Math.sqrt(deltas.reduce((n,x)=>n+Math.pow(x.observed-transmission*x.expected,2),0)/deltas.length);
    const backgroundChange=texelChecks[0].checks[2].actual.reduce((n,v,i)=>n+Math.abs(v-texelChecks[1].checks[2].actual[i]),0);
    const contrasts=[0,1].map(point=>texelChecks[0].checks[point].actual.reduce((n,v,i)=>n+Math.abs(v-texelChecks[1].checks[point].actual[i]),0));
    assert.ok(contrasts.every(n=>n>=45)&&backgroundChange<=45,`both actual original-art UVs change in opposed source-palette directions with contrast ${contrasts}, static paper ${backgroundChange}`);
    texelChecks.push({transmissionDiagnostic:transmission,residualDiagnostic:residual,backgroundChange,contrasts});

    for(let y=r.y+2;y<r.y+r.height-2;y++)for(let x=r.x+2;x<r.x+r.width-2;x++){const px=c.x+x*c.width/a.viewport_width,py=c.y+y*c.height/a.viewport_height,p=pixels.pixel(px,py),q=next.pixel(px,py);if(p.reduce((n,v,i)=>n+Math.abs(v-q[i]),0)>55)changed++;if(p[0]>200&&p[1]>180&&p[2]>140)paperPixels++;if(p[2]>p[0]&&p[1]>p[0])inkPixels++;}
    assert.ok(changed>=Math.max(15,(r.width-4)*(r.height-4)*0.20),`original artwork changes >=20% of inner projected bounds (${changed} / ${(r.width-4)*(r.height-4)})`);
    await writeFile(`artifacts/invitation-texels-${size.width}x${size.height}-${touch?'finger':'mouse'}.json`,JSON.stringify(texelChecks,null,2));
    await page.screenshot({path:`artifacts/invitation-world-future-${size.width}x${size.height}-${touch?'finger':'mouse'}-${initial.gathering_layout}.png`});
    await page.keyboard.press('KeyG');await settle();await page.keyboard.press('KeyZ');await settle();assert.equal((await snap()).bea_invitation.copied,true);assert.equal((await snap()).bea_invitation.choice,'future');
    const copied=await save();await page.reload();await page.locator('#status').waitFor({state:'hidden',timeout:60000});await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.startup_pending&&!window.__tenderloinGodotA11ySnapshot.layout_refit_pending);await page.keyboard.press('Escape');await settle();assert.equal(await save(),copied,'completed invitation reload writes no save or frozen photo');assert.equal((await snap()).bea_invitation.choice,'future');
    await page.keyboard.press('Digit1');await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.conversation_detail.panel.visible&&!window.__tenderloinGodotA11ySnapshot.player_grounding.path_active,{},{timeout:25000});await settle();assert.match((await snap()).block_detail_text,/paper flags/,'actual Bea conversation remembers copied invitation');assert.equal(JSON.stringify(JSON.parse(await save()).epilogue.photo),photo);
    await page.screenshot({path:`artifacts/invitation-bea-memory-${size.width}x${size.height}-${touch?'finger':'mouse'}.png`});
  }
  assert.equal(await page.evaluate(()=>localStorage.getItem('tenderloin-redux.save.v1')),legacy);
  beaInvitationChecks.push({width:size.width,height:size.height,touch,layout:initial.gathering_layout,worldProof,changed,paperPixels,inkPixels});
}

async function verifyQuietSeats(page,touch,size,complete=false,worldProof=false) {
  const snap=()=>page.evaluate(()=>window.__tenderloinGodotA11ySnapshot),save=()=>page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1'));
  async function settle(){const f=(await snap()).ui_frame;await page.waitForFunction(f=>{const s=window.__tenderloinGodotA11ySnapshot;return s.ui_frame>f+2&&!s.layout_refit_pending&&!s.compact_panel_layout_pending;},f);}
  async function tap(b){b=await revealPhoneControl(page,b,tap);let s=await snap(),c=await page.locator('#canvas').boundingBox();assert.ok(b.visible&&b.width>=44&&b.height>=44);assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=size.width+1&&b.y+b.height<=size.height+1,'quiet action actually reachable');const x=c.x+(b.x+b.width/2)*c.width/s.viewport_width,y=c.y+(b.y+b.height/2)*c.height/s.viewport_height;if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);await settle();}
  await page.setViewportSize(size);await settle();
  if((await snap()).story_detail.panel.visible)await page.keyboard.press('Escape');
  if(!(await snap()).block_panel_control.visible)await page.keyboard.press('KeyG');
  await settle();assert.equal((await snap()).hosting_current,'pause');
  const initial=JSON.parse(await save()),photo=JSON.stringify(initial.epilogue.photo),music=(await snap()).music_playing,pose=(await snap()).camera_pose;
  const images=[],positions=[];
  for(const [id,index] of [['pairs',1],['arc',0],['pairs',1]]){
    await tap((await snap()).quiet_seats.buttons[index]);let q=(await snap()).quiet_seats;
    assert.equal(q.choice,id);assert.ok(q.buttons[index].selected);assert.equal(q.buttons[index].accessible_name,QUIET_CHOICES[id]+" , selected");assert.equal(q.people.length,2);assert.ok(!q.copied);assert.equal(JSON.parse(await save()).hosting.draft.quiet,id);
    assert.equal(JSON.stringify(JSON.parse(await save()).epilogue.photo),photo);assert.equal((await snap()).music_playing,music);assert.deepEqual((await snap()).camera_pose,pose,'quiet choice does not take camera');
    assert.match(q.explanation,/woven green cushion/);assert.match(await page.locator('#godot-a11y-status').textContent(),id==='arc'?/open arc of seats/:/pair and an open seat/);
    const title=`${size.width}x${size.height}-${touch?'finger':'mouse'}-${initial.gathering_layout}-${id}-${images.length}`;
    await page.screenshot({path:`artifacts/quiet-seats-${title}.png`});
    positions.push(q.people.map(p=>p.local_x));images.push(title);
  }
  assert.notDeepEqual(positions[0],positions[1],'actual guest meshes move between center and ends');
  if(!touch){await page.keyboard.press('Shift+Tab');await page.keyboard.press('Space');await settle();assert.equal((await snap()).quiet_seats.choice,'arc','real Tab/Space selects quiet choice');await page.keyboard.press('Shift+KeyZ');await settle();assert.equal((await snap()).quiet_seats.choice,'pairs');}
  await page.keyboard.press('Shift+KeyZ');await settle();assert.equal((await snap()).quiet_seats.choice,'arc','old real keyboard customization remains');assert.match((await snap()).block_detail_text,/An open arc of seats/,'keyboard change refreshes the complete panel reader');
  // Close removes the editor while the actual curb-lane scene remains visible.
  await tap((await snap()).block_close_control);await settle();
  const fixedPlayer=(await snap()).player_grounding;
  if(worldProof){
    await tap((await snap()).walking_controls.find(b=>b.text.includes('Find Me')));
    for(let i=0;i<4;i++)await tap((await snap()).walking_controls.find(b=>b.text.includes('Zoom')&&b.text.includes('+')));
    for(let i=0;i<6;i++){
      const s=await snap(),q=s.quiet_seats,r=s.play_area,c=await page.locator('#canvas').boundingBox(),cx=(q.people[0].x+q.people[1].x+q.cushion.x)/3,cy=(q.people[0].y+q.people[1].y+q.cushion.y)/3;
      const dx=Math.max(-size.width*.35,Math.min(size.width*.35,r.x+r.width*.5-cx)),dy=Math.max(-size.height*.15,Math.min(size.height*.15,r.y+r.height*.5-cy));if(Math.hypot(dx,dy)<=10)break;
      const x=c.x+(r.x+r.width*.5)*c.width/size.width,y=c.y+(r.y+r.height*.5)*c.height/size.height;
      await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx*c.width/size.width,y+dy*c.height/size.height,{steps:8});await page.mouse.up();await settle();
    }
  }
  const world=await snap();await page.screenshot({path:`artifacts/quiet-seats-world-${size.width}x${size.height}-${touch?'finger':'mouse'}-${initial.gathering_layout}.png`});
  const pixels=screenshotPixels(await page.screenshot()),c=await page.locator('#canvas').boundingBox();
  let colored=0,total=0;
  for(const person of world.quiet_seats.people){const r=person.bounds;for(let y=Math.max(world.header_control.y+world.header_control.height,r.y);y<Math.min(size.height-110,r.y+r.height);y++)for(let x=Math.max(0,r.x);x<Math.min(size.width,r.x+r.width);x++){
    const rgb=pixels.pixel(c.x+x*c.width/size.width,c.y+y*c.height/size.height);total++;if((rgb[0]>rgb[2]*1.15&&rgb[0]>100)||(rgb[2]>rgb[0]*1.12&&rgb[2]>100))colored++;
  }}
  let worldChange;
  if(worldProof){
    assert.equal(world.following_player,false);assert.equal(world.player_grounding.x,fixedPlayer.x);assert.equal(world.player_grounding.z,fixedPlayer.z);
    const arc=world.quiet_seats.people,arcShot=pixels,inspection=world.camera_pose;
    await page.keyboard.press('KeyG');await settle();await tap((await snap()).quiet_seats.buttons[1]);await tap((await snap()).block_close_control);await settle();
    const pair=await snap(),pairShot=screenshotPixels(await page.screenshot());assert.deepEqual(pair.camera_pose,inspection,'choice and Close preserve deliberate manual inspection');
    await page.screenshot({path:`artifacts/quiet-seats-world-pairs-${size.width}x${size.height}-${touch?'finger':'mouse'}-${initial.gathering_layout}.png`});
    const changed=r=>{let count=0,samples=0;for(let y=Math.max(0,r.y);y<Math.min(size.height,r.y+r.height*.55);y++)for(let x=Math.max(0,r.x);x<Math.min(size.width,r.x+r.width);x++){samples++;const x0=c.x+x*c.width/size.width,y0=c.y+y*c.height/size.height,a=arcShot.pixel(x0,y0),b=pairShot.pixel(x0,y0);if(a.reduce((n,v,i)=>n+Math.abs(v-b[i]),0)>60)count++;}return {count,samples};};
    // Upper bodies exclude the relocated stool/cushion: both vacated and newly occupied places must really change.
    const vacated=changed(arc[1].bounds),occupied=changed(pair.quiet_seats.people[1].bounds);assert.ok(vacated.count>=6&&occupied.count>=6,`actual seated upper bodies visibly move (${vacated.count}/${occupied.count})`);worldChange={vacated,occupied};
    await page.keyboard.press('KeyG');await settle();await tap((await snap()).quiet_seats.buttons[0]);await tap((await snap()).block_close_control);await settle();
  }
  const expected=await save();await page.reload();await page.locator('#status').waitFor({state:'hidden',timeout:60000});await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.startup_pending);await page.keyboard.press('Escape');await settle();assert.equal(await save(),expected,'loading active quiet seating writes nothing');assert.equal((await snap()).quiet_seats.choice,'arc');
  if(complete){await page.keyboard.press('KeyG');await settle();for(let p=0;p<3&&!(await snap()).block_hub_actions.some(b=>b.text.includes('Host Activity'));p++)await tap((await snap()).block_page_next);await tap((await snap()).block_hub_actions.find(b=>b.text.includes('Host Activity')));await settle();assert.equal((await snap()).quiet_seats.copied,true);const saved=await save();await page.reload();await page.locator('#status').waitFor({state:'hidden',timeout:60000});await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.startup_pending);await page.keyboard.press('Escape');await settle();assert.equal(await save(),saved);assert.ok((await snap()).quiet_seats.copied&&!((await snap()).quiet_seats.row.visible));}
  if((await snap()).music_playing!==music)await tap((await snap()).music_toggle_control);
  const result={worldChange,width:size.width,height:size.height,touch,layout:initial.gathering_layout,complete,positions,images,colored,total};quietSeatChecks.push(result);await writeFile(`artifacts/quiet-seats-result-${size.width}-${touch?'finger':'mouse'}-${initial.gathering_layout}.json`,JSON.stringify(result,null,2));return result;
}

async function verifyFilmScreening(page,context,touch,size,world=false) {
  const encloses=(a,b)=>b.x>=a.x-1&&b.y>=a.y-1&&b.x+b.width<=a.x+a.width+1&&b.y+b.height<=a.y+a.height+1;
  const snap=()=>page.evaluate(()=>window.__tenderloinGodotA11ySnapshot), save=()=>page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1'));
  async function settle(){const f=(await snap()).ui_frame;await page.waitForFunction(f=>{const s=window.__tenderloinGodotA11ySnapshot;return s.ui_frame>f+3&&!s.layout_refit_pending&&!s.film_screening.layout_pending;},f);}
  async function tap(b){b=await revealPhoneControl(page,b,tap);const s=await snap(),c=await page.locator('#canvas').boundingBox();assert.ok(b?.visible&&b.width>=44&&b.height>=44,'screening has reachable44px action');const x=c.x+(b.x+b.width/2)*c.width/s.viewport_width,y=c.y+(b.y+b.height/2)*c.height/s.viewport_height;if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);await settle();}
  await page.setViewportSize(size);await settle();
  if((await snap()).story_detail.panel.visible){await page.keyboard.press('Escape');await settle();}
  if(!(await snap()).block_panel_control.visible || (await snap()).block_hub_actions.length===0){await page.keyboard.press('KeyG');await settle();}
  assert.equal(JSON.parse(await save()).film.phase,'done','screening fixture must be a valid actually completed film');
  for(let pageIndex=0;pageIndex<3&&!(await snap()).block_hub_actions.some(b=>b.text.includes('Watch Film'));pageIndex++)await tap((await snap()).block_page_next);
  const before=await save(),parsed=JSON.parse(before),legacy=await page.evaluate(()=>localStorage.getItem('tenderloin-redux.save.v1'));
  assert.equal(parsed.film.phase,'done');
  const start=await snap(),music=start.music_playing,point=start.player_grounding;
  await tap(start.block_hub_actions.find(b=>b.text.includes('Watch Film')));
  let s=await snap();assert.ok(s.film_screening.visible&&!s.header_control.visible&&!s.block_panel_control.visible);
  const pose=s.camera_pose,images=[];
  await tap(s.film_screening.buttons[3]);assert.equal((await snap()).music_playing,!music);await tap((await snap()).film_screening.buttons[3]);assert.equal((await snap()).music_playing,music,'independent Music preserves quiet intent');
  for(let i=0;i<3;i++){
    await tap((await snap()).film_screening.buttons[i]);s=await snap();const f=s.film_screening;
    assert.equal(f.shot,parsed.film.result.order[i]);assert.equal(f.caption,filmCaption(parsed.film.result,f.shot));assert.equal(f.svg,filmFrameSVG(parsed.film.result,f.shot),'all actually displayed drawings preserve original cross-track export parity');assert.ok(f.text.includes(f.caption)&&f.text.includes('Your ending is'));
    assert.ok(f.buttons[i].pressed&&f.buttons[i].accessible_name.includes('selected'));
    const status=await page.locator('#godot-a11y-status').textContent();assert.ok(status.includes(f.caption)&&status.includes(f.description),'real live bridge announces complete caption and text alternative');
    const pix=screenshotPixels(await page.screenshot()),c=await page.locator('#canvas').boundingBox(),r=f.picture;let ink=0,paper=0,warm=0;const sample=[];
    for(let y=.1;y<.9;y+=.02)for(let x=.05;x<.95;x+=.02){const rgb=pix.pixel(c.x+(r.x+x*r.width)*c.width/s.viewport_width,c.y+(r.y+y*r.height)*c.height/s.viewport_height);if(rgb[0]<100&&rgb[1]<150&&rgb[2]<130)ink++;if(rgb.every(v=>v>190))paper++;if(rgb[0]>140&&rgb[0]>rgb[1]*1.2&&rgb[1]>80)warm++;sample.push(rgb.join(','));}
    assert.ok(ink>10&&paper>200,'actual frame contains illustrated ink and light paper, not a flat color');if(parsed.film.result.framing==='wide')assert.ok(warm>10,'actual wide frame shows volunteered hands');images.push({shot:f.shot,ink,paper,warm,fingerprint:sample.join('|')});
    await page.screenshot({path:`artifacts/open-seat-${size.width}x${size.height}-${touch?'finger':'mouse'}-${f.shot}.png`});
  }
  assert.equal(new Set(images.map(x=>x.fingerprint)).size,3,'all three actual rendered drawings differ');
  await tap((await snap()).film_screening.buttons[0]);await page.keyboard.press('Tab');await page.keyboard.press('Space');await settle();assert.equal((await snap()).film_screening.frame,1,'real Tab and Space select the next shot');
  // Scrolling the complete narrative is an actual read, with no walking.
  s=await snap();await tap(s.film_screening.reader);await page.keyboard.press('End');await settle();s=await snap();assert.ok(s.film_screening.scroll>0&&s.film_screening.scroll+s.film_screening.scroll_page>=s.film_screening.scroll_max-2,'reader reaches final explanation');
  if(touch){const b=s.film_screening.reader,c=await page.locator('#canvas').boundingBox(),x=c.x+(b.x+b.width*.5)*c.width/s.viewport_width,y=c.y+(b.y+b.height*.5)*c.height/s.viewport_height,cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+28,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();await settle();assert.ok((await snap()).film_screening.scroll<s.film_screening.scroll,'finger reads original complete narrative');}
  else{const b=s.film_screening.reader;await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.wheel(0,-200);await settle();assert.ok((await snap()).film_screening.scroll<s.film_screening.scroll);}
  for(let i=0;i<8;i++){await page.keyboard.press('Tab');await settle();assert.ok((await snap()).film_screening.focus_within,'Tab remains in focused screening');}
  await page.keyboard.down('KeyW');await settle();await page.keyboard.up('KeyW');await page.keyboard.press('Period');await settle();s=await snap();assert.equal(s.player_grounding.x,point.x);assert.equal(s.player_grounding.z,point.z);assert.deepEqual(s.camera_pose,pose,'watching owns no camera');assert.equal(s.music_playing,music);assert.equal(await save(),before,'watching never writes copied save, sequence or awards');
  for(const boundary of [{width:320,height:568},{width:640,height:360},size]){await page.setViewportSize(boundary);await settle();s=await snap();const f=s.film_screening,v={x:0,y:0,width:boundary.width,height:boundary.height};for(const b of [f.top,f.tray,f.picture,...f.buttons])assert.ok(encloses(v,b),'open rotation keeps art and controls on-screen');assert.ok(f.picture.height>=90);}
  assert.deepEqual((await snap()).camera_pose,pose,'open rotation preserves the owned camera pose');
  await page.setViewportSize({width:320,height:568});await settle();await tap((await snap()).film_screening.buttons[4]);assert.ok(!(await snap()).film_screening.visible);assert.equal((await snap()).block_hub_page,2,'close after wide-to-paged rotation reveals Watch Film');
  await page.setViewportSize(size);await settle();assert.equal(await save(),before);assert.equal((await snap()).music_playing,music);
  await page.keyboard.press('F4');await settle();assert.ok((await snap()).film_screening.visible);await page.keyboard.press('Escape');await settle();assert.ok(!(await snap()).film_screening.visible);
  if(world){
    await page.keyboard.press('KeyM');await page.waitForFunction(()=>{const s=window.__tenderloinGodotA11ySnapshot;return s.mural_detail.panel.visible&&!s.player_grounding.path_active;},null,{timeout:35000});await tap((await snap()).mural_detail.buttons.at(-1));
    const oldPoint=(await snap()).player_grounding;await page.keyboard.down('KeyS');try{await page.waitForFunction(p=>{const q=window.__tenderloinGodotA11ySnapshot.player_grounding;return Math.hypot(q.x-p.x,q.z-p.z)>=3;},oldPoint,{timeout:10000});}finally{await page.keyboard.up('KeyS');}await settle();s=await snap();assert.ok(Math.hypot(s.player_grounding.x-oldPoint.x,s.player_grounding.z-oldPoint.z)>=3,'real walking moves avatar aside before framing the actual easel');
    // Use actual camera input for a lower inspection angle; small world ink can be occluded overhead.
    await page.keyboard.down('Shift');await page.keyboard.down('ArrowDown');await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.camera_pose.pitch<=.550001);await page.keyboard.up('ArrowDown');await page.keyboard.up('Shift');await settle();
    for(let i=0;i<5;i++)await tap((await snap()).walking_controls.find(b=>b.text.includes('Zoom')&&b.text.includes('+')));
    s=await snap();const q=s.film_easel.corners,r=s.play_area,c=await page.locator('#canvas').boundingBox(),center={x:q.reduce((n,p)=>n+p.x,0)/4,y:q.reduce((n,p)=>n+p.y,0)/4},x=c.x+(r.x+r.width*.5)*c.width/s.viewport_width,y=c.y+(r.y+r.height*.25)*c.height/s.viewport_height;
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+(r.x+r.width*.5-center.x)*c.width/s.viewport_width,y+(r.y+r.height*.5-center.y)*c.height/s.viewport_height,{steps:10});await page.mouse.up();await settle();s=await snap();assert.ok(s.film_easel.visible&&s.film_easel.textured&&s.film_easel.uv_scale_x===3&&s.film_easel.uv_scale_y===2);
    const corners=s.film_easel.corners,pix=screenshotPixels(await page.screenshot());let paper=0,ink=0;for(let u=.08;u<.92;u+=.02)for(let v=.14;v<.86;v+=.02){const x=(corners[0].x*(1-u)+corners[1].x*u)*(1-v)+(corners[2].x*(1-u)+corners[3].x*u)*v,y=(corners[0].y*(1-u)+corners[1].y*u)*(1-v)+(corners[2].y*(1-u)+corners[3].y*u)*v;assert.ok(x>=0&&y>=0&&x<size.width&&y<size.height);const rgb=pix.pixel(c.x+x*c.width/s.viewport_width,c.y+y*c.height/s.viewport_height);if(rgb.every(v=>v>180))paper++;if(rgb[0]<100&&rgb[1]<160)ink++;}assert.ok(paper>100&&ink>5,`actual existing world easel renders original paper and ink (${paper}/${ink})`);await page.screenshot({path:`artifacts/open-seat-world-${size.width}.png`});
  }
  const inspection=(await snap()).camera_pose;await page.keyboard.press('F4');await settle();assert.ok((await snap()).film_screening.visible);await page.setViewportSize({width:559,height:360});await settle();assert.deepEqual((await snap()).camera_pose,inspection,'actual manual or followed pose survives short-width rotation');await page.setViewportSize(size);await settle();await page.reload();await page.locator('#status').waitFor({state:'hidden',timeout:60000});await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.startup_pending);await page.keyboard.press('Escape');await settle();assert.ok(!(await snap()).film_screening.visible);assert.equal(await save(),before);assert.equal(await page.evaluate(()=>localStorage.getItem('tenderloin-redux.save.v1')),legacy);
  await page.keyboard.press('F4');await settle();assert.ok((await snap()).film_screening.visible,'completed film reopens after silent startup dismissal');assert.equal((await snap()).film_screening.frame,0,'reload restores transient first frame');await page.keyboard.press('Escape');await settle();
  if((await snap()).music_playing!==music)await tap((await snap()).music_toggle_control);assert.equal((await snap()).music_playing,music,'test context restores quiet/play intent after the explicit reload');
  filmScreeningChecks.push({width:size.width,height:size.height,touch,framing:parsed.film.result.framing,plan:parsed.film.result.plan,order:parsed.film.result.order,world,images:images.map(({fingerprint,...x})=>x)});
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
    await context.addInitScript(installRhythmAudioProbe);
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
    await phoneAwareMouseClick(page,(await page.evaluate(()=>window.__tenderloinGodotA11ySnapshot)).walking_controls[1]);
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.in_wide_overview === true);
    const before = await page.screenshot({ path: `artifacts/godot-${size.width}-overview.png` });
    const mapState=await page.evaluate(()=>window.__tenderloinGodotA11ySnapshot);
    if(mapState.phone_disclosure.enabled){
      assert.equal(mapState.walking_controls[0].text,'Back to Me');
      await phoneAwareMouseClick(page,mapState.walking_controls[0]);
      await page.waitForFunction(()=>!window.__tenderloinGodotA11ySnapshot.in_wide_overview&&window.__tenderloinGodotA11ySnapshot.camera_view_size===45);
    }
    await phoneAwareMouseClick(page,(await page.evaluate(()=>window.__tenderloinGodotA11ySnapshot)).walking_controls[0]);
    await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.announcement.startsWith('Next: '));
    // After Back to Me, a nearby speaker can deliver the hint as a bubble.
    // Info remains deliberately reachable without requiring the old map hint layout.
    if(mapState.phone_disclosure.enabled && !(await page.evaluate(()=>window.__tenderloinGodotA11ySnapshot)).header_details_expanded) await clickHeaderControl('info_control');
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.header_details_expanded === true, null, { timeout: 5000 });
    await clickHeaderControl('info_control');
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.header_details_expanded === false);
    // Re-open the map after exercising the phone's direct Back to Me primary.
    if(mapState.phone_disclosure.enabled){
      await phoneAwareMouseClick(page,(await page.evaluate(()=>window.__tenderloinGodotA11ySnapshot)).walking_controls[1]);
      await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot.in_wide_overview);
    }
    await phoneAwareMouseClick(page,(await page.evaluate(()=>window.__tenderloinGodotA11ySnapshot)).walking_controls[2]);
    await page.waitForTimeout(300);
    const after = await page.screenshot({ path: `artifacts/godot-${size.width}-find-me.png` });
    assert.notDeepEqual(before, after, `Find Me returns from the Tenderloin map at ${size.width}`);
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.camera_view_size === 45);
    await phoneAwareMouseClick(page,(await page.evaluate(()=>window.__tenderloinGodotA11ySnapshot)).walking_controls[3]);
    await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.camera_view_size < 45);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    const keyboard = await page.screenshot();
    await page.waitForFunction(() => Math.abs(window.__tenderloinGodotA11ySnapshot?.camera_view_size - 45) < 0.01);
    assert.notDeepEqual(before, keyboard, 'Zoom in followed by Tab/Enter on Zoom out retains the close walking view');
    // Activate the original Walk control through its measured visible position.
    await phoneAwareMouseClick(page,(await page.evaluate(()=>window.__tenderloinGodotA11ySnapshot)).walking_controls[5]);
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
    // Genuine M1: photo and packing; an explicit owner return, then original Y fast path.
    await page.keyboard.press('KeyY');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tenderloin-redux.godot.save.v1')).epilogue.photo.status==='taken');
    await page.keyboard.press('KeyY');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tenderloin-redux.godot.save.v1')).epilogue.packing===true);
    await verifyLoanHomecoming(page,size.width!==1100,size);
    if(size.width===1100){await verifyLoanHomecoming(page,false,size,false,'speaker');await verifyLoanHomecoming(page,false,size,false,'table');}
    else for (let yStep = 0; yStep < 2; yStep++) { const count=JSON.parse(await page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1'))).epilogue.returned.length;await page.keyboard.press('KeyY');await page.waitForFunction(n=>JSON.parse(localStorage.getItem('tenderloin-redux.godot.save.v1')).epilogue.returned.length===n+1,count); }
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
    if(size.width===1100){
      await verifyProgrammeStudio(page,false,size,true);
      await verifyRhythmCircle(page,false,size,true);
      await verifyQuietSeats(page,false,size);
      await page.keyboard.press('KeyZ');await page.waitForTimeout(80);
      await verifyBeaInvitation(page,false,size);
      await page.keyboard.press('KeyZ');await page.waitForTimeout(80);
      await verifySharedPanel(page,false,size,true);
    }else{
      for(let zStep=0;zStep<2;zStep++){await page.keyboard.press('KeyZ');await page.waitForTimeout(80);}
      await verifyBeaInvitation(page,true,size);
      await page.keyboard.press('KeyZ');await page.waitForTimeout(80);
      await verifyRhythmCircle(page,true,size,true);
      await verifyQuietSeats(page,true,size);
      await page.keyboard.press('KeyZ');await page.waitForTimeout(80);
      await verifySharedPanel(page,true,size,true);
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
    await verifyCivicListening(page,size.width<600,size);
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
    await verifyFilmScreening(page,context,size.width<600,size,size.width===1100);
    await verifyCivicListening(page,size.width<600,size,true);
    await verifySharedPanel(page,size.width<600,size);
    await verifyProgrammeStudio(page,size.width<600,size);
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
    await page.waitForFunction(() => {const s=window.__tenderloinGodotA11ySnapshot;return s?.block_panel_control.visible&&/^(?:Talking with )?Bea (?:\(|\u00b7 Turn )/.test(s.conversation_header);}, null, { timeout: 35000 });
    // Read-only native control geometry; all activation remains real browser clicks.
    async function clickConversationAction(id) {
      const before=await page.evaluate(()=>window.__tenderloinGodotA11ySnapshot);
      if(id!=="whats_next"&&before.phone_disclosure.enabled&&!before.phone_disclosure.actions_open) await phoneAwareMouseClick(page,before.conversation_detail.buttons[1]);
      await page.waitForFunction(actionId => window.__tenderloinGodotA11ySnapshot?.conversation_actions?.some(a => a.id === actionId), id);
      const previousFrame = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot.ui_frame);
      await page.waitForFunction(frame => window.__tenderloinGodotA11ySnapshot?.ui_frame > frame, previousFrame);
      const snap = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
      const action = snap.conversation_actions.find(a => a.id === id);
      assert.ok(action && action.width >= 44 && action.height >= 44, `${id} must retain a 44px target at ${size.width}`);
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
      if (size.width < 600 && tourComplete.overlays.speech.deferred) {
        assert.equal(tourComplete.overlays.speech.deferred, true, 'crowded phone reward postpones host speech');
        assert.equal(afterBannerTap.overlays.speech.deferred, true, 'speech remains deferred during this reward');
        assert.equal(afterBannerTap.overlays.speech.remaining, tourComplete.overlays.speech.remaining, 'deferred speech keeps all reading time');
      } else if(size.width < 600) {
        assert.ok(tourComplete.overlays.speech.visible && afterBannerTap.overlays.speech.visible,'roomy phone shows the complete speech alongside its reward');
        assertReadableOverlays(afterBannerTap,`${size.width}px simultaneous reward and speech after banner tap`);
        assert.equal(afterBannerTap.overlays.speech.text,tourComplete.overlays.speech.text);
        assert.ok(afterBannerTap.overlays.speech.remaining>0 && afterBannerTap.overlays.speech.remaining<=tourComplete.overlays.speech.remaining,'visible speech retains positive honest reading time');
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
    assert.equal(parsedSave.celeste_talk_count, size.width===1100?2:1, 'desktop genuine owner path adds exactly one original Celeste Chat; phone paths use the other owners');
    assert.equal(parsedSave.mural_palette, 'sunset');
    assert.equal(parsedSave.rook_soundcheck_done, true);
    assert.equal(parsedSave.block_opened, true);
    assert.equal(parsedSave.history_read, true);
    assert.equal(parsedSave.blackhawk_discovered, true);
    assert.equal(parsedSave.district_boundary_visible, false);
    assert.equal(parsedSave.epilogue?.photo?.status, 'taken');
    assert.deepEqual(parsedSave.epilogue?.photo?.participants, ['bea', 'celeste', 'dez', 'thanh']);
    assert.deepEqual(parsedSave.epilogue?.returned, ['table', 'paint-case', 'speaker']);
    assert.deepEqual(parsedSave.programme?.published, ['art', 'beats', 'pause', 'stories'], 'reload retains the future revision posted through the Studio');
    assert.deepEqual(parsedSave.hosting?.order, size.width === 1100 ? ['beats', 'pause', 'stories', 'art'] : ['stories', 'beats', 'pause', 'art'], 'the later revision never replaces the programme actually hosted');
    assert.equal(parsedSave.hosting?.results?.length, 4);
    assert.equal(parsedSave.civic?.phase, 'done');
    assert.deepEqual(parsedSave.civic?.result, {topic:'access',format:'dropin',notes:size.width<600?'none':'themes'}, 'reload retains the exact three choices made through the new real controls');
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
    assert.equal((await page.evaluate(()=>window.__tenderloinGodotA11ySnapshot)).quiet_seats.choice,'pairs','imported copied quiet result renders actual scene');
    assert.equal(afterValidImport.godotSave.hosting?.results?.[2]?.value, 'future', 'Imported stories segment must preserve future value');
    assert.equal((await page.evaluate(()=>window.__tenderloinGodotA11ySnapshot)).bea_invitation.choice,'future','read-only browser import renders the copied future invitation');
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
        control=await revealPhoneControl(page,control,shortTap);
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
      await page.waitForFunction(() => {
        const s = window.__tenderloinGodotA11ySnapshot;
        return s?.viewport_width === 844 && s.viewport_height === 390 && !s.layout_refit_pending && !s.compact_panel_layout_pending;
      });
      await page.keyboard.press('KeyG');
      await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot.block_hub_side);
      let rotating = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
      while (rotating.block_hub_page < 2) {
        // Page state can publish before Godot containers finish rearranging the
        // shared Next/Listen row. Capture the real target after composed frames.
        const pagingFrame = rotating.ui_frame;
        await page.waitForFunction(f => {
          const s = window.__tenderloinGodotA11ySnapshot;
          return s.ui_frame > f + 2 && s.block_panel_control.visible && s.block_hub_side && !s.layout_refit_pending && !s.compact_panel_layout_pending && !s.civic_listening?.layout_pending;
        }, pagingFrame);
        rotating = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
        assert.ok(rotating.block_page_next.visible && !rotating.block_page_next.disabled);
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
    for(const rs of size.width===390?[size]:[size,{width:520,height:360},{width:559,height:360}])await verifyRhythmCircle(page,size.width<600,rs);
    await page.setViewportSize(size);
    await verifyMuralWorkshop(page, context, size.width < 600, size);
    await verifyMuralStories(page, context, size.width < 600, size);
    await verifyPowerStory(page,size.width<600,size);
    await verifyLarkinStory(page,size.width<600,size);
    await verifyDogStory(page,size.width<600,size);
    await verifyLanternProcession(page,size.width<600,size);
    await verifyVotingStory(page,size.width<600,size);
    if(size.width<600){for(const ps of size.width===390?[size,{width:559,height:360},{width:599,height:360}]:[size])await verifyMapPinch(page,context,ps);await page.setViewportSize(size);}
    if(!rhythmFixtureSave)rhythmFixtureSave=await page.evaluate(()=>localStorage.getItem("tenderloin-redux.godot.save.v1"));
    await context.close();
  }
  // PRIVATE earlier-state copies derive from THIS full run's actually completed save.
  for(const [width,height,touch,layout] of [[1100,760,false,'table'],[390,667,true,'floor'],[320,667,true,'table'],[520,360,true,'floor'],[559,360,false,'table'],[640,360,false,'floor']]){
    const fixture=JSON.parse(rhythmFixtureSave),order=width===640?['stories','pause','beats','art']:['stories','beats','pause','art'];assert.equal(fixture.epilogue.photo.status,'taken');
    fixture.gathering_layout=layout;fixture.programme.order=order;fixture.programme.published=order;fixture.hosting.order=order;fixture.hosting.results=order.slice(0,order.indexOf('pause')).map(id=>fixture.hosting.results.find(r=>r.id===id));fixture.hosting.draft.quiet='arc';
    fixture.civic={...fixture.civic,phase:'idle',result:null};fixture.film={...fixture.film,phase:'idle',result:null,captured:[]};
    const size={width,height},context=await browser.newContext({viewport:size,hasTouch:touch}),page=await context.newPage();latestPage=page;
    await context.addInitScript(f=>{if(!localStorage.getItem('tenderloin-redux.godot.save.v1'))localStorage.setItem('tenderloin-redux.godot.save.v1',JSON.stringify(f));},fixture);
    context.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('data:')&&!r.url().startsWith('blob:'))external.push(r.url());});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(base);await page.locator('#status').waitFor({state:'hidden',timeout:60000});await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.startup_pending&&!window.__tenderloinGodotA11ySnapshot.layout_refit_pending);await page.keyboard.press('Escape');
    await verifyQuietSeats(page,touch,size,true,true);await context.close();
  }
  // PRIVATE listening invitations derive from THIS run's genuine completed profile.
  for(const [width,height,touch,layout] of [[520,360,true,'floor'],[559,360,false,'table'],[640,360,true,'table']]){
    const fixture=JSON.parse(rhythmFixtureSave);fixture.gathering_layout=layout;fixture.civic={phase:'idle',draft:{topic:'repairs',format:'circle',notes:'themes'},result:null};fixture.film={...fixture.film,phase:'idle',result:null,captured:[]};
    const size={width,height},context=await browser.newContext({viewport:size,hasTouch:touch}),page=await context.newPage();latestPage=page;
    await context.addInitScript(f=>localStorage.setItem('tenderloin-redux.godot.save.v1',JSON.stringify(f)),fixture);
    context.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('data:')&&!r.url().startsWith('blob:'))external.push(r.url());});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(base);await page.locator('#status').waitFor({state:'hidden',timeout:60000});await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.startup_pending&&!window.__tenderloinGodotA11ySnapshot.layout_refit_pending);await page.keyboard.press('Escape');
    await verifyCivicListening(page,touch,size);await context.close();
  }
  // PRIVATE current-run copied profiles, stories after quiet interval, real world ink in both layouts.
  for(const [width,height,touch,layout] of [[1100,760,false,'table'],[320,667,true,'floor'],[520,360,true,'table'],[559,360,false,'floor']]){
    const fixture=JSON.parse(rhythmFixtureSave),order=['pause','stories','beats','art'];fixture.gathering_layout=layout;fixture.programme.order=order;fixture.programme.published=order;fixture.hosting.order=order;fixture.hosting.results=[{id:'pause',value:'pairs'}];fixture.hosting.draft.story='memory';
    fixture.civic={phase:'idle',draft:{topic:'repairs',format:'circle',notes:'themes'},result:null};fixture.film={phase:'idle',draft:{framing:'close',plan:'quiet',order:['seat','paint','welcome']},result:null,captured:[]};
    const size={width,height},context=await browser.newContext({viewport:size,hasTouch:touch}),page=await context.newPage();latestPage=page;
    await context.addInitScript(f=>{if(!localStorage.getItem('tenderloin-redux.godot.save.v1'))localStorage.setItem('tenderloin-redux.godot.save.v1',JSON.stringify(f));},fixture);
    context.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('data:')&&!r.url().startsWith('blob:'))external.push(r.url());});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(base);await page.locator('#status').waitFor({state:'hidden',timeout:60000});await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.startup_pending&&!window.__tenderloinGodotA11ySnapshot.layout_refit_pending);await page.keyboard.press('Escape');
    await verifyBeaInvitation(page,touch,size,true);await context.close();
  }
  // A private fixture derived from actual progression covers legal beats-last/zero completion.
  {
    const fixture=JSON.parse(rhythmFixtureSave),order=['stories','pause','art','beats'];
    assert.equal(fixture.epilogue.photo.status,'taken');fixture.hosting.order=order;fixture.programme.order=order;fixture.programme.published=order;fixture.hosting.results=order.slice(0,3).map(id=>fixture.hosting.results.find(r=>r.id===id));fixture.hosting.draft.pattern=85;
    // Civic/film completion requires finished hosting: this PRIVATE earlier-state copy must rewind those later arcs too.
    fixture.civic={...fixture.civic,phase:'idle',result:null};fixture.film={...fixture.film,phase:'idle',result:null,captured:[]};
    await writeFile('artifacts/rhythm-beats-last-private-fixture.json',JSON.stringify(fixture,null,2));
    const size={width:390,height:667},context=await browser.newContext({viewport:size,hasTouch:true}),page=await context.newPage();latestPage=page;
    await context.addInitScript(s=>{if(!localStorage.getItem('tenderloin-redux.godot.save.v1'))localStorage.setItem('tenderloin-redux.godot.save.v1',s);},JSON.stringify(fixture));
    await context.addInitScript(installRhythmAudioProbe);
    context.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('data:')&&!r.url().startsWith('blob:'))external.push(r.url());});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(base);await page.locator('#status').waitFor({state:'hidden',timeout:60000});await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.startup_pending&&!window.__tenderloinGodotA11ySnapshot.layout_refit_pending);await page.keyboard.press('Escape');
    await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.hosting_completed_count===3&&window.__tenderloinGodotA11ySnapshot.hosting_current==='beats'&&!window.__tenderloinGodotA11ySnapshot.startup_pending);
    await verifyRhythmCircle(page,true,size,true,true);await context.close();
  }
  // PRIVATE partial drafts derive from THIS full run's actually completed profile.
  for(const [width,height,touch] of [[520,360,true],[559,360,false],[640,360,true]]){
    const fixture=JSON.parse(rhythmFixtureSave);assert.equal(fixture.epilogue.photo.status,'taken');fixture.programme.order=['stories'];
    if(width===640){fixture.programme.published=[];fixture.hosting.order=[];fixture.hosting.results=[];fixture.civic.phase='idle';fixture.civic.result=null;fixture.film.phase='idle';fixture.film.result=null;fixture.film.captured=[];}
    const size={width,height},context=await browser.newContext({viewport:size,hasTouch:touch}),page=await context.newPage();latestPage=page;
    context.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('data:')&&!r.url().startsWith('blob:'))external.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
    await context.addInitScript(f=>{if(!localStorage.getItem('tenderloin-redux.godot.save.v1'))localStorage.setItem('tenderloin-redux.godot.save.v1',JSON.stringify(f));},fixture);
    await page.goto(base);await page.locator('#status').waitFor({state:'hidden',timeout:60000});await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.startup_pending&&!window.__tenderloinGodotA11ySnapshot.layout_refit_pending);await page.keyboard.press('Escape');
    if(width===640){const partial=await page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1'));await page.reload();await page.locator('#status').waitFor({state:'hidden',timeout:60000});await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.startup_pending);await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>localStorage.getItem('tenderloin-redux.godot.save.v1')),partial,'partial draft before first posting reloads without a write');}
    await verifyProgrammeStudio(page,touch,size);await context.close();
  }
  // A separate fresh profile proves first-time auto-advance; the seven late
  // cases above separately preserve actually taken keepsakes from progression.
  {
    const freshSize={width:390,height:667},context=await browser.newContext({viewport:freshSize,hasTouch:true}),page=await context.newPage();latestPage=page;
    context.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('data:')&&!r.url().startsWith('blob:'))external.push(r.url());});
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(base);await page.locator('#status').waitFor({state:'hidden',timeout:60000});
    await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.startup_pending&&!window.__tenderloinGodotA11ySnapshot.layout_refit_pending);
    const s=await page.evaluate(()=>window.__tenderloinGodotA11ySnapshot),b=s.start_control,c=await page.locator('#canvas').boundingBox();
    await page.touchscreen.tap(c.x+(b.x+b.width/2)*c.width/s.viewport_width,c.y+(b.y+b.height/2)*c.height/s.viewport_height);
    await verifyMuralStories(page,context,true,freshSize,false);await verifyMuralWorkshop(page,context,true,freshSize,false);await context.close();
  }
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  // Explicit PRIVATE completed copies of THIS run's genuinely completed profile.
  for(const [width,height,touch,layout] of [[520,360,true,'table'],[559,360,false,'floor'],[640,360,true,'table']]){
    const fixture=JSON.parse(rhythmFixtureSave);fixture.gathering_layout=layout;assert.equal(fixture.epilogue.photo.status,'taken');assert.ok(fixture.hosting.results.some(r=>r.id==='art'));
    const context=await browser.newContext({viewport:{width,height},hasTouch:touch});await context.addInitScript(({save,sentinel})=>{if(!localStorage.getItem('tenderloin-redux.godot.save.v1')){localStorage.setItem('tenderloin-redux.godot.save.v1',save);localStorage.setItem('tenderloin-redux.save.v1',sentinel);}}, {save:JSON.stringify(fixture),sentinel:BROWSER_SAVE_SENTINEL});
    const page=await context.newPage();latestPage=page;page.on('pageerror',error=>errors.push(String(error)));page.on('request',request=>{if(![base,'blob:','data:'].some(p=>request.url().startsWith(p)))external.push(request.url());});await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('#status').waitFor({state:'hidden',timeout:60000});await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.startup_pending);await page.keyboard.press('Escape');await verifySharedPanel(page,touch,{width,height});await context.close();
  }
  // PRIVATE pending-return copies of THIS run's actually completed profile.
  for(const [width,height,touch,layout] of [[520,360,true,'table'],[559,360,false,'floor'],[640,360,true,'floor']]){
    const fixture=JSON.parse(rhythmFixtureSave);fixture.gathering_layout=layout;fixture.epilogue.packing=true;fixture.epilogue.returned=[];
    const context=await browser.newContext({viewport:{width,height},hasTouch:touch});await context.addInitScript(f=>{if(!localStorage.getItem('tenderloin-redux.godot.save.v1'))localStorage.setItem('tenderloin-redux.godot.save.v1',JSON.stringify(f));},fixture);
    const page=await context.newPage();latestPage=page;page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(![base,'blob:','data:'].some(p=>r.url().startsWith(p)))external.push(r.url());});await page.goto(base);await page.locator('#status').waitFor({state:'hidden',timeout:60000});await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.startup_pending);await page.keyboard.press('Escape');await verifyLoanHomecoming(page,touch,{width,height},true);await context.close();
  }
  // PRIVATE completed copies of THIS run exercise all short repair docks.
  for(const [width,height,touch,layout] of [[520,360,true,'floor'],[559,360,false,'table'],[640,360,true,'floor']]){
    const fixture=JSON.parse(rhythmFixtureSave);fixture.gathering_layout=layout;
    const context=await browser.newContext({viewport:{width,height},hasTouch:touch});await context.addInitScript(f=>{if(!localStorage.getItem('tenderloin-redux.godot.save.v1'))localStorage.setItem('tenderloin-redux.godot.save.v1',JSON.stringify(f));},fixture);
    const page=await context.newPage();latestPage=page;page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(![base,'blob:','data:'].some(p=>r.url().startsWith(p)))external.push(r.url());});await page.goto(base);await page.locator('#status').waitFor({state:'hidden',timeout:60000});await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.startup_pending);await page.keyboard.press('Escape');await verifyPowerStory(page,touch,{width,height},true);await context.close();
  }
  // PRIVATE completed copies of THIS run verify the short dog reader with both inputs/layouts.
  for(const [width,height,touch,layout] of [[520,360,true,'table'],[559,360,false,'floor'],[640,360,true,'floor']]){
    const fixture=JSON.parse(rhythmFixtureSave);fixture.gathering_layout=layout;
    const context=await browser.newContext({viewport:{width,height},hasTouch:touch});await context.addInitScript(f=>{if(!localStorage.getItem('tenderloin-redux.godot.save.v1'))localStorage.setItem('tenderloin-redux.godot.save.v1',JSON.stringify(f));},fixture);
    const page=await context.newPage();latestPage=page;page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(![base,'blob:','data:'].some(p=>r.url().startsWith(p)))external.push(r.url());});await page.goto(base);await page.locator('#status').waitFor({state:'hidden',timeout:60000});await page.waitForFunction(()=>window.__tenderloinGodotA11ySnapshot?.startup_pending);await page.keyboard.press('Escape');await verifyDogStory(page,touch,{width,height},true);await context.close();
  }
  assert.equal(mapPinchChecks.length,4);assert.equal(votingStoryChecks.length,3);assert.ok(votingStoryChecks.every(c=>!c.privateFixture));
  assert.equal(lanternProcessionChecks.length,3);assert.ok(lanternProcessionChecks.every(c=>!c.privateFixture));
  assert.equal(dogStoryChecks.length,6);assert.equal(dogStoryChecks.filter(c=>!c.privateFixture).length,3);
  assert.equal(larkinStoryChecks.length,3);assert.equal(powerStoryChecks.length,6);assert.equal(powerStoryChecks.filter(c=>!c.privateFixture).length,3);
  await verifyLoanWorld(browser,rhythmFixtureSave,base);
  await verifyPhoneDisclosure(browser,base);
  assert.equal(phoneDisclosureChecks.length,6);
  assert.equal(loanHomecomingChecks.length,8);assert.equal(loanWorldChecks.length,3);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  await writeFile('artifacts/godot-browser.json', JSON.stringify({ runs, sourceFingerprint, phoneDisclosureChecks, mapPinchChecks, votingStoryChecks, lanternProcessionChecks, dogStoryChecks, larkinStoryChecks, powerStoryChecks, loanHomecomingChecks, loanWorldChecks, sharedPanelChecks, programmeStudioChecks, civicListeningChecks, beaInvitationChecks, quietSeatChecks, filmScreeningChecks, rhythmCircleChecks, rhythmAuditionChecks, muralStoryChecks, livingMuralChecks, errors, external, limit: 'Pixel-change, isolated Godot localStorage save/reload, opt-in browser v1 save import, Web local WAV audition, DOM aria-live status bridge, wider 188-building Tenderloin exploration, M1 keepsake/loan returns, M3 programme/hosting, M4 civic listening hour & three-shot film short, M5 default-off neighborhood voices & isolated settings, M6 original SVG generation/export & measured local performance budgets, and driver-inspected screenshots, not full canvas button DOM/screen-reader or physical-phone acceptance.' }, null, 2));
  assert.ok(queuedActivityRewardChecks > 0, 'at least one actual crowded activity exercises queued reward timer and Close delivery');
  assert.ok(shortStartClicked && shortStartTouchClicked, 'real mouse and touch Start at640x360 were exercised');
  assert.equal(beaInvitationChecks.length,7,'three genuine current progression and four private post-quiet invitation cases');
  assert.equal(quietSeatChecks.length,9,'three genuine progression and six private current-source quiet cases are required');
  assert.equal(filmScreeningChecks.length,3,'all required actual progression contexts watch their completed film');
  assert.equal(rhythmAuditionChecks.length,11,'all eleven active/practice cases actually auditioned');
  assert.ok(rhythmAuditionChecks.every(c=>c.outputObserved),'all eleven cases observe real mixer output');
  assert.equal(rhythmCircleChecks.length,11,'three actual progression active, seven genuine late-practice and one private beats-last rhythm case executed');
  assert.equal(livingMuralChecks.length,8,'all eight old and fresh scene contexts also paint and reload music/garden');
  assert.ok(livingMuralChecks.filter(c=>c.reactions.length===2).length>=2,'actual resident dialogue notices both saved scenes');
  assert.equal(muralStoryChecks.length,8,'seven genuine taken-photo and one fresh scene-composition case executed');
  assert.equal(muralStoryChecks.filter(c=>c.asymmetric).length,1,'a fresh single-sided street-board capture proves left/right UV orientation');
  assert.equal(shortStoryReadChecks.length, 11, 'all required short startup reading cases executed');
  assert.equal(shortStoryReadChecks.filter(r => r.touch).length, 4, 'all four emulated short-phone reading cases use real touch input');
  assert.equal(shortHubChecks.length, 8, 'six mouse and two touch short hub cases exercised');
  assert.equal(shortActivityChecks.length, 18, 'twelve mouse and six finger short activity reading cases exercised');
  assert.equal(narrowActivityChecks.length, 39, 'twenty-seven mouse and twelve finger narrow-small activity cases exercised');
  assert.equal(narrowActivityChecks.filter(c=>c.width>=520&&c.width<560&&c.height<560).length,12,'all twelve new small landscape readers were exercised');
  assert.equal(passiveActivityChecks.length,12,'all twelve real passive walking arrivals were exercised');
  assert.equal(civicListeningChecks.length,9,'three genuine active plus three post-film re-reads and three current-run private short invitations');
  assert.equal(sharedPanelChecks.length,9,'three genuine active panels, three genuine copied reads and three PRIVATE current-run short copied readers');
  assert.equal(sharedPanelChecks.filter(c=>c.active).length,3);
  assert.equal(programmeStudioChecks.length,7,'one genuine nondefault hosting order, three genuine future revisions and three private current-run partial drafts');
  assert.equal(programmeStudioChecks.filter(c=>c.preHost).length,1,'a real first programme starts hosting its actual nondefault arrangement');
  assert.equal(programmeStudioChecks.filter(c=>c.partialBeforePost).length,1,'one private current-run case reloads a partial draft before its first posting');
  assert.equal(narrowHubChecks.length, 12, 'eight mouse and four finger narrow hub handoffs exercised');
  assert.equal(smallHubReaderChecks,4,'all four new mouse/finger small dock cases read overflowing full dialogue');
  assert.equal(shortWalkingChecks.length,10,'six mouse and four finger short walking cases exercised');
  assert.ok(shortWalkingCaptionChecks>0&&shortWalkingGuideChecks>0,'real short walking caption and guide checks are nonvacuous');
  assert.equal(muralWorkshopChecks.length,8,'seven late and one fresh actual workshop mouse/finger cases executed');
  assert.equal(muralWorkshopChecks.filter(c=>c.photoStatus==='taken').length,7,'all seven late cases preserve a saved taken keepsake');
  assert.equal(workshopAutoAdvanceChecks,3,'a fresh mural exercises all three automatically offered contributions');
  console.log(JSON.stringify({ runs, sourceFingerprint, phoneDisclosureChecks, mapPinchChecks, votingStoryChecks, lanternProcessionChecks, dogStoryChecks, larkinStoryChecks, powerStoryChecks, loanHomecomingChecks, loanWorldChecks, sharedPanelChecks, programmeStudioChecks, civicListeningChecks, rhythmCircleChecks, rhythmAuditionChecks, livingMuralChecks, muralWorkshopChecks, workshopAutoAdvanceChecks, queuedActivityRewardChecks, shortStoryReadChecks, shortHubChecks, shortActivityChecks, narrowActivityChecks, passiveActivityChecks, narrowHubChecks, smallHubReaderChecks, shortWalkingChecks, shortWalkingCaptionChecks, shortWalkingGuideChecks, shortStartClicked, shortStartTouchClicked, errors, external }));
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
