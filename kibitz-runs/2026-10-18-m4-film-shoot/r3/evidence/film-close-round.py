from pathlib import Path
import json,hashlib,shutil,urllib.request,datetime
root=Path('C:/tenderloin-redux').resolve();c=root/'kibitz-runs/2026-10-18-m4-film-shoot/r3'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
source={'version':'0.12.0','fingerprint':'2a9641a83499cdb6ba7f7c43d6cd9c8fa7ce34ce689b3be461b1f21ae5f84567'}
names=['browser-results.json','voices-browser-results.json','civic-browser-results.json','film-browser-results.json','film-voices-isolation.json']
qa={name:read(root/'artifacts'/name)for name in names}
for name,result in qa.items():assert result['source']==source,name
assert qa['browser-results.json']['staticRootIsolation']=='pass'
assert len(qa['film-browser-results.json']['results'])==8 and len(qa['civic-browser-results.json']['results'])==8
assert all(not r['errors']and not r['external']for r in qa['film-browser-results.json']['results'])
assert any('civic event and film complete3times' in str(e.get('fullCoreOffOnOff',''))for e in qa['voices-browser-results.json']['evidence'])
node=(root/'artifacts/film-node-final.log').read_text(encoding='utf-8-sig');assert 'pass 90'in node and 'fail 0'in node
assert '[OK] claude (rc=0)'in(root/'artifacts/film-kibitz.log').read_text(encoding='utf-8-sig')
assert (c/'claude_model_selected.txt').read_text().strip()=='claude-opus-5-5'
assert (c/'claude_effort_selected.txt').read_text().strip()=='high'
assert (c/'claude.md').read_text(encoding='utf-8').startswith('TOOL CHECK: PASS')
assert read(c/'source_review_comparison.json')=={'changed':[],'new_files':[]}
live=json.load(urllib.request.urlopen('http://127.0.0.1:4173/__build'));assert live==source
manual=root/'docs/CLAUDE_MANUAL_REVIEW.md';prior=root/'kibitz-runs/2026-10-18-m4-civic-listening/r3/claude.md'
assert sha(manual)=='3c6548df658ca822e91e1039e1c36a388c306ed1c2a56f513733d51c9267dae8'
assert sha(prior)=='092f1e36f98faea433634b08cdfd7353b103ce18dfcbaf2894d814a612bd5535'
status=root/'docs/BUILD_STATUS.md';text=status.read_text(encoding='utf-8')
text=text.replace('Final cross-feature gates are pending below.','Final cross-feature gates pass as recorded below.')
text=text.replace('## Current round — The Open Seat, 0.12.0 (final gates pending)','## Latest completed round — The Open Seat, 0.12.0')
text=text.replace('Current evidence:90Node tests and syntax pass; final film/civic Chrome suites and supplemental film off/on/off pass. Full final core and extended Voices runs are still pending. Public fingerprint','Final evidence:90Node tests, syntax/diff, complete core/Voices/civic/film Chrome suites and supplemental film off/on/off pass on public fingerprint')
text=text.replace('Final extended Voices/core JSONs and final source/live preview match will be recorded only after passing.','Final extended Voices completes the actual opening, second gathering, civic and film off/on/off with identical relevant outcomes except player coordinates, and again with the optional module absent. Final core also passes; all JSONs match the final source/live preview.')
text=text.replace('No QA failure found this round so far;','No QA failure found this round;')
text=text.replace('M4 representative implementation acceptance awaits final gates; full-game acceptance remains false.','Both representative M4 implementations now pass their acceptance gates; full-game acceptance remains false.')
status.write_text(text,encoding='utf-8')
final=f'''# Accepted implementation checkpoint — 0.12.0

The Open Seat, an original fictional illustrated film project, accepted on public fingerprint **{source['fingerprint']}**. Both M4 representatives are implemented; full-game acceptance remains false. Hourly automation remains active. Next independent work is M6 measured local performance/release/provenance and M2 dated current-location verification; human play/current physical appearance/final recorded music remain open.

After civic completion, explicitly accept the agreed shoot, choose close-up objects or props with volunteered fictional hands, quiet descriptive-caption work or waiting for a dialogue-caption cue, and arrange three authored shots in any order. Freeze the copied plan, hold while Thanh uses the route, explicitly clear and capture each drawing in sequence. Three captures complete the project; manual screening is read-only and has no autoplay. Partial plan/hold/capture/done reload; latest five-neighbor responses remember choices. Rook helps off camera and declines a picture; no one else is depicted. Prior event screens remain reachable, earlier header lines superseded. No map/world/audio change or optional dependency.

One successful native Claude CLI via installed Kibitz, exact requested **claude-opus-5-5/high**, rc0, one actual prompt. Driver family excluded, r3only; r1/r2/r4notrun, not fullarc. Current requested Argon pin explicitly checked separately from runner-default Flash; authorized native alternative used without blindly repeating historical Argon no-report timeout or making current quota/permanent-availability claims. Auth0, usage/cost not exposed. No AGYOpus/Astra/purchase/extra panel/re-review.

Reviewer found no broken phase/save/gating contract. Source-grounded fixes add capture-progress signal to persistent modal-status, missing fixture syntax check, explicit pre-civic-completion UI/journal exclusion,44px width+height and no-inner-live-region checks. Driver extended real Voices journey through civic and film off/on/off and missing-module runs. All optional critique/assumptions judged in judgment.md.72-file source archive and zero-drift reviewer comparison retained; raw/manual/prior hashes preserved.

Final **90/90Node**, syntax/diff, complete core Chrome155.0.8059.84, Voices, civic and film suites pass on matching source. New rules execute48journeys across24film plans/both layouts with capture-prefix reload.8browser representatives cover all6orders/all4framing-plan pairs distributed across320x844/390x667/1440x844 and both layouts, not every combination at every viewport. They verify native choice/order/view keyboard controls, persistent edit/capture status, mandatory hold, phase/capture/deterministic replacement double-click guards, visible heading/control/Back/Escape/x focus,44px/no overflow,3different read-only frames, preserved other/optional state, actual Rook off-camera memory and restart. Civic browser separately proves film hidden through planning/meeting and visible after actual civic completion; core separately completes gatherings.

Voices completes opening+second gathering+civic+film3times off/on/off with equal relevant outcomes except player coordinates, plus complete gameplay with optional module missing. Separate civic-complete floor fixture compares entire film outcomes exactly off/on/off and confirms disable cannot alter completion. No external requests/page errors in feature fixtures. Final JSONs/live preview/source manifest/evidence hashes freeze accepted results. Earlier pre-review passes on0f207a025de506c1c5e5c3aa012aa8f65a1d20c656f9a5ab22f9bb2ced19a136 are historical. No QA failures this round, no repeat paid review. Owned lock released after final integrity check.

Original geometric SVG/prose only. Illustrated sequence with captions, not recorded film/audio, actual camera/microphone access, real movie reference/production/permit/community consent or surveyed access. No personal input, imported film/public-art/source media, real likeness or uncleared TenderVoice material. No physical phone/full screen-reader speech/human pacing, final score/provenance/quality acceptance; bounded Enter-repeat UX unverified, existing cross-tab last-writer-wins retained. No commit/push/publication/outreach/purchase. Full game unfinished.
'''
(c/'final.md').write_text(final,encoding='utf-8')
evidence=c/'evidence';evidence.mkdir(exist_ok=True)
for p in [*list((root/'artifacts').glob('film*')),*[root/'artifacts'/name for name in names]]:
 if p.is_file():shutil.copy2(p,evidence/p.name)
paths=[p for d in ['public','tests','scripts','docs']for p in(root/d).rglob('*')if p.is_file()]+[root/p for p in ['README.md','package.json','.gitignore']]
manifest={p.relative_to(root).as_posix():{'sha256':sha(p),'bytes':p.stat().st_size}for p in sorted(paths)}
(c/'source_final.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8');before=read(c/'source_after_review.json')
receipt={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':source,
 'nodeTests':{'total':90,'passed':90,'failed':0},'syntax':'pass','gitDiffCheck':'pass',
 'browser':{'version':'155.0.8059.84','core':'complete pass','voices':'complete pass, full current story off/on/off and missing module','civic':'complete pass','film':'complete pass','isolatedServers':True},
 'filmUnitJourneys':48,'filmBrowserCases':8,'filmCoverage':'All6orders/all4framing-plan pairs across3viewport sizes and both layouts; not each combination at each size',
 'review':{'provider':'native Claude CLI via installed Kibitz','modelRequested':'claude-opus-5-5','effortRequested':'high','rc':0,'actualPrompts':1,'sha256':sha(c/'claude.md'),'usagePercent':'not exposed','cost':'not exposed'},
 'requestedArgonPin':'Current with explicit KIBITZ_AGY_MODEL; no AGY prompt/default Flash substitution',
 'noReviewerSourceDrift':True,'driverChangesAfterReview':[k for k in manifest if before.get(k)!=manifest[k]],
 'inputSHA256':sha(c/'input.md'),'anchorSHA256':sha(c/'driver_anchor.md'),'manualReportSHA256':sha(manual),'precedingReviewSHA256':sha(prior),'finalManifestSHA256':sha(c/'source_final.json'),
 'livePreviewMatches':True,'roundsNotRun':['r1','r2','r4'],'fullGameComplete':False,'automation':'remain active hourly','next':'M6 measured local performance/release/provenance and M2 dated current-location verification',
 'limits':['no physical phone','no full screen-reader speech audit','no human pacing/joy measure','illustrated frames, no actual movie/audio recording','no real production/permit/community consent or surveyed access certification','no final recorded score/provenance/quality acceptance','pre-existing cross-tab last-writer-wins','Enter-repeat planning UX not manually audited'],
 'evidenceFiles':{p.name:sha(p)for p in sorted(evidence.iterdir())if p.is_file()}}
(c/'verification.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:receipt[k]for k in ['source','nodeTests','browser','review','livePreviewMatches','fullGameComplete','next']},indent=2))
