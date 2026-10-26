from pathlib import Path
import subprocess,json,hashlib,datetime,time,os,shutil,re,sys
r=Path('C:/tenderloin-redux');a=r/'artifacts/programme-enactment-20261026';out=a/'final1-continuation'
assert not out.exists(), 'Never duplicate a continuation; read its actual stage/execution first'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
ready=json.loads((a/'continuation-ready.json').read_text(encoding='utf-8'));source=ready['source_hashes']
hashes=lambda:{p:sha(r/p) for p in source}
assert hashes()==source
original_ready=json.loads((a/'final-ready.json').read_text(encoding='utf-8'))
assert all(source[p]==h for p,h in original_ready['source_hashes'].items())
assessment=json.loads((a/'native-reassessment.json').read_text(encoding='utf-8'))
assert assessment['native_execution_accepted'] and assessment['not_a_rerun'] and assessment['required_check_family_count']==28 and assessment['pass_marker_family_count']==27
assert set(assessment['pass_marker_families'])==set(original_ready['native_tokens'])-{'SMALL_PASS'}
assert assessment['small_layout_coverage']['count']==16 and assessment['small_layout_coverage']['requires_clean_full_suite_exit_and_final_pass']
assert not assessment['small_layout_coverage']['literal_SMALL_PASS_exists']
for rel,h in assessment['bound_artifact_hashes'].items():assert sha(a/rel)==h
review=json.loads((r/'kibitz-runs/2026-10-26-codex-programme-enactment/r3/execution-receipt.json').read_text(encoding='utf-8'))
assert review['harness_rc']==0 and review['sources_unchanged'] and review['selected_model']=='claude-opus-5-5' and review['selected_effort']=='high'
assert ready['review_grounded'] and ready['known_findings_resolved']
original=json.loads((a/'final1/execution.json').read_text(encoding='utf-8'));assert original['rc']==1 and list(original['gates'])==['native']
native=original['gates']['native'];assert native['rc']==0 and native['clean'] and native['sources_unchanged'] and native['native_asfound_unchanged']
# Preserve the rejected literal-token observation in final1; corrected acceptance names the actual evidence.
native={k:v for k,v in native.items() if k!='tokens'}
native.update(accepted_after_observer_reassessment=True,pass_marker_families=assessment['pass_marker_families'],small_layout_coverage=assessment['small_layout_coverage'],required_check_family_count=28,original_native_log_sha256=assessment['bound_artifact_hashes']['final1/native.log'],rerun=False)
u=Path('C:/Users/jeffr/AppData/Roaming/Godot/app_userdata/Tenderloin Redux \u2014 measured block/godot_block_save_v1.json');known='2b7d1e849b4820a1d6c49602930ac3e0b104a8aa132375837038bfef80f2e0e1'
assert u.stat().st_size==1272 and sha(u)==known
assert sha(r/'artifacts/godot-web/index.pck')==original_ready['development_pack_sha256']
lock=r/'.build-round.lock';owned=json.loads(lock.read_text(encoding='utf-8'));assert owned['owner']=='codex-programme-enactment-20261026' and owned['pid']==6396
out.mkdir();(out/'source-before.json').write_text(json.dumps(source,indent=2),encoding='utf-8')
for p in source:
 dst=out/'inputs'/p;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(r/p,dst)
shutil.copy2(r/'artifacts/godot-web/index.pck',out/'development-input-index.pck')
owned.update(stage='Full native accepted after observer-only reassessment; frozen unrun-gates continuation active',controller_pid=os.getpid(),controller='kibitz-runs/2026-10-26-codex-programme-enactment/r3/continue-final1.py',stage_receipt='artifacts/programme-enactment-20261026/final1-continuation/stage.json',next_action='Finish export/check/node/browser continuation only; retain original native and failed observer receipts; no duplicate gates or source edits.',updated_utc=datetime.datetime.now(datetime.timezone.utc).isoformat());lock.write_text(json.dumps(owned,indent=2),encoding='utf-8',newline='\n')
gates={'native':native};started=time.time();env=os.environ.copy();env['PLAYWRIGHT_MODULE']='C:/Users/jeffr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';env['GODOT_PORT']='4174'
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def save():
 (out/'gate-exits.json').write_text(json.dumps(gates,indent=2),encoding='utf-8')
 (out/'stage.json').write_text(json.dumps({'utc':now(),'gates':list(gates),'owner':os.getpid()},indent=2),encoding='utf-8')
save()
try:
 for key,cmd in [('export',['npm.cmd','run','godot:export']),('check',['npm.cmd','run','check']),('node',['npm.cmd','test']),('browser',['npm.cmd','run','godot:browser'])]:
  assert hashes()==source
  (out/"stage.json").write_text(json.dumps({"stage":key,"started_utc":now(),"owner":os.getpid()},indent=2),encoding="utf-8")
  if key=="browser":
   pck=r/"artifacts/godot-web/index.pck";pack_hash=hashlib.sha256(pck.read_bytes()).hexdigest();shutil.copy2(pck,out/"input-index.pck")
   (out/"browser-source-before.json").write_text(json.dumps({**source,"artifacts/godot-web/index.pck":pack_hash},indent=2),encoding="utf-8")
  st=time.time();log=out/(key+".log")
  with log.open("wb") as f:proc=subprocess.run(cmd,cwd=r,stdout=f,stderr=subprocess.STDOUT,env=env)
  text=log.read_text(encoding="utf-8",errors="replace");receipt={"rc":proc.returncode,"seconds":time.time()-st,"finished_utc":now(),"sources_unchanged":hashes()==source,"native_asfound_unchanged":len(u.read_bytes())==1272 and hashlib.sha256(u.read_bytes()).hexdigest()==known}
  gates[key]=receipt;save() # Preserve base rc/source/protected-save evidence even if derived parsing fails.
  if key=="node":
   counts=re.findall(r"\btests\s+(\d+)",text);receipt["tests"]=int(counts[-1]) if counts else 0
  if key=="browser":
   receipt["pack_unchanged"]=hashlib.sha256(pck.read_bytes()).hexdigest()==pack_hash
   receipt["result_exists"]=(r/"artifacts/godot-browser.json").exists() and (r/"artifacts/godot-browser.json").stat().st_mtime>=st
   captures=out/"browser-evidence";captures.mkdir()
   for f in (r/"artifacts").iterdir():
    if f.is_file() and f.stat().st_mtime>=st and f.suffix.lower() in [".json",".png",".svg",".webp",".wav",".zip"]:shutil.copy2(f,captures/f.name)
   if receipt["result_exists"]:
    b=json.loads((r/"artifacts/godot-browser.json").read_text(encoding="utf-8"));receipt.update(departure_cases=len(b.get("departureChecks",[])),genuine_departure_cases=len([x for x in b.get("departureChecks",[]) if not x.get("privateFixture",True) and x.get("actualReload") and x.get("retainedInvitation") and x.get("skipParity") and x.get("relocationInvalidates") and x.get("stillPanels")==3 and len(x.get("returnChecks",[]))>=6 and len(x.get("linkEvidence",[]))==3]),departure_widths=sorted([x.get("width") for x in b.get("departureChecks",[])]),departure_spares=len(set(x.get("spare") for x in b.get("departureChecks",[]))),habitat_cases=len(b.get("habitatRoomChecks",[])),genuine_habitat_cases=len([x for x in b.get("habitatRoomChecks",[]) if not x.get("privateFixture",True) and x.get("actualReload") and x.get("retainedInvitation") and len(x.get("helperMovements",[]))==3 and len(x.get("relocation",[]))==2 and len(x.get("returnChecks",[]))>=9]),habitat_widths=sorted([x.get("width") for x in b.get("habitatRoomChecks",[])]),browser_fingerprint_matches=b.get("sourceFingerprint",{}).get("pack_sha256")==pack_hash and all(source.get(p)==h for p,h in b.get("sourceFingerprint",{}).get("sources",{}).items()),helper_cases=len(b.get("helperBenchChecks",[])),genuine_helper_cases=len([x for x in b.get("helperBenchChecks",[]) if not x.get("privateFixture",True) and x.get("actualReload") and x.get("retainedInvitation") and len(x.get("guideClearance",[]))==2]),opening_cases=len(b.get("beforeStreetsChecks",[])),genuine_opening_startups=len([x for x in b.get("beforeStreetsChecks",[]) if not x.get("privateFixture",True) and x.get("mode")=="startup"]),genuine_opening_revisits=len([x for x in b.get("beforeStreetsChecks",[]) if not x.get("privateFixture",True) and x.get("mode")=="revisit"]),errors=b.get("errors"),external=b.get("external"),hosted_cases=len(b.get("hostedAfternoonChecks",[])),genuine_hosted_earned=len([x for x in b.get("hostedAfternoonChecks",[]) if not x.get("privateFixture",True) and x.get("focusOnly",False)]),genuine_hosted_done=len([x for x in b.get("hostedAfternoonChecks",[]) if not x.get("privateFixture",True) and x.get("phase")=="done"]),shared_meal_cases=len(b.get("sharedMealChecks",[])),community_invitation_cases=len(b.get("communityInvitationChecks",[])),genuine_earned_invitations=len([x for x in b.get("communityInvitationChecks",[]) if not x.get("privateFixture",True) and not x.get("readOnly",True)]),fresh_phone_cases=len(b.get("phoneDisclosureChecks",[])),actual_pinch_cases=len(b.get("mapPinchChecks",[])),expanded_info_pinch_cases=len([x for x in b.get("mapPinchChecks",[]) if x.get("expandedInfoMap") and x.get("actualInfoEnd") and x.get("mixedUiMap")]),genuine_voting_cases=len([x for x in b.get("votingStoryChecks",[]) if not x.get("privateFixture",True)]))
  if key=="browser" and receipt["result_exists"]:
   orbital=b.get("orbitalChecks",[])
   receipt.update(orbital_cases=len(orbital),orbital_widths=sorted(x.get("width") for x in orbital),orbital_views=len(set(x.get("sharedView") for x in orbital)),genuine_orbital_cases=len([x for x in orbital if not x.get("privateFixture",True) and x.get("actualReload") and x.get("retainedInvitation") and x.get("relocationInvalidates") and x.get("noWrites") and x.get("quiet") and x.get("interruptedShareCleared") and x.get("idleReaderScrollPreserved") and len(x.get("returnChecks",[]))>=5 and len(x.get("tileEvidence",[]))==6 and len(x.get("frameEvidence",[]))==3 and len(x.get("focusEvidence",[]))==3 and {f.get("actor") for f in x.get("focusEvidence",[]) if f.get("blurCount",0)>0}=={"player","resident"} and x.get("walkingPixels",0)>=20 and x.get("residentPixels",0)>=20]))
  if key=="browser" and receipt["result_exists"]:
   finale=b.get("finaleChecks",[])
   receipt.update(finale_cases=len(finale),finale_widths=sorted(x.get("width") for x in finale),finale_choices=len(set(x.get("chosen") for x in finale)),genuine_finale_cases=len([x for x in finale if not x.get("privateFixture",True) and x.get("actualReload") and x.get("retainedInvitation") and x.get("relocationInvalidates") and x.get("noWrites") and x.get("quiet") and x.get("authoredReturn") and x.get("skipParity") and x.get("gatheringPixels",0)>=20 and len(x.get("memories",[]))==3 and len(x.get("panels",[]))==3 and len(x.get("returns",[]))==6 and x.get("phaseBoundaries") and len(x.get("returnVisual",[]))==6 and len(x.get("faceEvidence",[]))==5]))
  if key=="export":
   pack=r/"artifacts/godot-web/index.pck";receipt.update(pack_bytes=pack.stat().st_size,pack_sha256=hashlib.sha256(pack.read_bytes()).hexdigest(),hard_cap=2097152,selected_allocation_cap=2096900)
  if key=="browser" and receipt["result_exists"]:
   programme=b.get("programmeGatheringChecks",[])
   flags=["actualReload","retainedInvitation","originalProgressPreserved","partialReentry","completedReentry","heldKeys","actualBridgeImports","repostRetainsCopy","newPostedPlan","scrollbar","repeatedFinishSafe","repeatedNextSafe"]
   receipt.update(programme_cases=len(programme),programme_widths=sorted(x.get("width") for x in programme),programme_orders=len({tuple(x.get("proposed",[])) for x in programme}),genuine_programme_cases=len([x for x in programme if not x.get("privateFixture",True) and all(x.get(k) for k in flags) and len(x.get("tiles",[]))==6 and len(x.get("slotEvidence",[]))==8 and len(x.get("copies",{}))==4 and len(x.get("gestures",[]))==3 and x.get("invitationColors",0)>12 and x.get("changed",0)>30 and x.get("gesturePixels",0)>20]))
  receipt["no_unaddressed_exceptions"]=not any(t in text for t in ["ERROR:","WARNING:","SCRIPT ERROR","UnhandledPromiseRejection"])
  gates[key]=receipt;save();print(key,json.dumps(receipt),flush=True)
  assert receipt["no_unaddressed_exceptions"] and receipt["rc"]==0 and receipt["sources_unchanged"] and receipt["native_asfound_unchanged"], key+" failed: preserve and diagnose, no blind rerun"
  if key=="export":assert (r/"artifacts/godot-web/index.pck").stat().st_size<=2096900
  if key=="node":assert receipt["tests"]>=106
  if key=="browser":assert receipt["programme_cases"]==3 and receipt["genuine_programme_cases"]==3 and receipt["programme_widths"]==[320,390,1100] and receipt["programme_orders"]==3 and receipt["finale_cases"]==3 and receipt["genuine_finale_cases"]==3 and receipt["finale_widths"]==[320,390,1100] and receipt["finale_choices"]==3 and receipt["orbital_cases"]==3 and receipt["genuine_orbital_cases"]==3 and receipt["orbital_widths"]==[320,390,1100] and receipt["orbital_views"]==3 and receipt["departure_cases"]==3 and receipt["genuine_departure_cases"]==3 and receipt["departure_widths"]==[320,390,1100] and receipt["departure_spares"]==3 and receipt["habitat_cases"]==3 and receipt["genuine_habitat_cases"]==3 and receipt["habitat_widths"]==[320,390,1100] and receipt["browser_fingerprint_matches"] and receipt["helper_cases"]==3 and receipt["genuine_helper_cases"]==3 and receipt["opening_cases"]==6 and receipt["genuine_opening_startups"]==3 and receipt["genuine_opening_revisits"]==3 and receipt["pack_unchanged"] and receipt["result_exists"] and receipt["errors"]==[] and receipt["external"]==[] and receipt["hosted_cases"]==4 and receipt["genuine_hosted_earned"]==3 and receipt["genuine_hosted_done"]==1 and receipt["shared_meal_cases"]==3 and receipt["community_invitation_cases"]==9 and receipt["genuine_earned_invitations"]==3 and receipt["fresh_phone_cases"]==6 and receipt["actual_pinch_cases"]==4 and receipt["expanded_info_pinch_cases"]==4 and receipt["genuine_voting_cases"]==3
 (out/"execution.json").write_text(json.dumps({"rc":0,"seconds":time.time()-started,"utc":now(),"gates":gates,"review_note":"Later driver corrections are documented, no duplicate paid r3","evidence_chain":"Original final1 native plus four unrun continuation gates; observer-only interruption retained","native_reassessment_sha256":sha(a/"native-reassessment.json")},indent=2),encoding="utf-8");print("ALL_FIVE_PROGRAMME_GATHERING_FINAL1_CONTINUATION_PASS",flush=True)
except BaseException as e:
 (out/"execution.json").write_text(json.dumps({"rc":1,"seconds":time.time()-started,"utc":now(),"gates":gates,"failure":str(e),"next":"Diagnose retained exact inputs and assertions before another sequence"},indent=2),encoding="utf-8");raise
