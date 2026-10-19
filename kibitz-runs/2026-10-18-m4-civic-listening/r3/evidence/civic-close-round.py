from pathlib import Path
import json, hashlib, shutil, urllib.request, datetime

root=Path('C:/tenderloin-redux').resolve()
c=root/'kibitz-runs/2026-10-18-m4-civic-listening/r3'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
source={'version':'0.11.0','fingerprint':'0a6f3d2f495daffe458bfcb59ef16c3ab75f357cdbb3a7dcda3bc9bef7381cf3'}
qa={name:read(root/'artifacts'/name) for name in ['browser-results.json','voices-browser-results.json','civic-browser-results.json','civic-short-viewport.json']}
for name,result in qa.items():assert result['source']==source,name
assert qa['browser-results.json']['staticRootIsolation']=='pass'
assert len(qa['civic-browser-results.json']['results'])==8
assert all(not item['errors'] and not item['external'] for item in qa['civic-browser-results.json']['results'])
assert 'pass 84' in (root/'artifacts/civic-node-final.log').read_text(encoding='utf-8-sig')
assert 'fail 0' in (root/'artifacts/civic-node-final.log').read_text(encoding='utf-8-sig')
assert '[OK] claude (rc=0)' in (root/'artifacts/civic-kibitz.log').read_text(encoding='utf-8-sig')
assert (c/'claude_model_selected.txt').read_text().strip()=='claude-opus-5-5'
assert (c/'claude_effort_selected.txt').read_text().strip()=='high'
assert (c/'claude.md').read_text(encoding='utf-8').startswith('TOOL CHECK: PASS')
assert read(c/'source_review_comparison.json')=={'changed':[],'new_files':[]}
live=json.load(urllib.request.urlopen('http://127.0.0.1:4173/__build'));assert live==source
manual=root/'docs/CLAUDE_MANUAL_REVIEW.md';prior=root/'kibitz-runs/2026-10-18-m3-m5-neighborhood-voices/r3/claude.md'
assert sha(manual)=='3c6548df658ca822e91e1039e1c36a388c306ed1c2a56f513733d51c9267dae8'
assert sha(prior)=='93fbf1fdd5cda302273e7d342125d3b7d45e5184dabff84c02507d5353f3d0fb'
status=root/'docs/BUILD_STATUS.md';text=status.read_text(encoding='utf-8')
text=text.replace('## Current round — A tenant listening hour, 0.11.0 (final core gate pending)','## Latest completed round — A tenant listening hour, 0.11.0')
text=text.replace('Current evidence: all84Node tests, syntax/diff, Chrome155.0.8059.84 Voices/civic suites and short-phone fixture pass; the complete final core browser run is still pending. Public fingerprint','Final evidence: all84Node tests, syntax/diff, complete Chrome155.0.8059.84 core/Voices/civic suites and short-phone fixture pass on public fingerprint')
text=text.replace('M4 civic implementation is awaiting its final core gate; full M4/full game unfinished.','M4 civic slice complete, full M4/full game unfinished.')
status.write_text(text,encoding='utf-8')
final=f'''# Accepted implementation checkpoint — 0.11.0

M4 fictional tenant listening hour accepted on public fingerprint **{source['fingerprint']}**. Full M4/full game unfinished. Next is an original permission-aware movie shoot; hourly automation remains active.

After both gatherings, explicit invitation/start, three planning choices, welcome/conversation/close and remembered neighbor responses form a saved later afternoon. Two topics, two quiet formats, anonymous authored themes/no notes. Format changes original schematic SVG; topic/notes affect prose and responses. No main map/world/audio change, real political stance, operational/permit/legal claim, attendee data/input/recording/signature or outbound message. Historical event memories remain reachable independently; latest civic responses supersede earlier neighbor header lines.

One successful native Claude CLI via installed Kibitz, exact requested **claude-opus-5-5/high**, rc0, one actual partner prompt. Driver family excluded, r3 only; r1/r2/r4 notrun, not fullarc. Current requested Argon pin explicitly checked separately from default Flash. Authorized native alternative selected without blindly repeating historical Argon no-report timeout; no current quota/permanent-failure claim. Auth passed, usage/cost not exposed. No AGYOpus/Astra/purchase/additional panel/paid rereview.

Source-grounded judgment fixes persistent status channel, replacement-control double-clicks, visible focus return with16px scroll margin, startup result-JSON removal and coverage wording. Added restore assertions; corrected idle Back copy. No speaker/screen-reader output certification. Read-only reviewer source comparison zero changes; before archive includes all67public/tests/scripts/docs/package/README/gitignore files.

Final gates on matching source: **84/84Node**, syntax/diff, complete core Chrome155.0.8059.84 suite, full Voices suite and civic suite pass. Core actually finishes both gatherings and verifies civic unlock. Civic uses valid rules-generated completed-gathering fixtures for8combinations distributed across320/390/1440 and both layouts (not each combination at each width), every-stage reload, original diagram/branch prose, immutable main/optional state, actual walk-to-Bea response, restart, persistent status, keyboard/visible return focus,44px/no overflow, phase double-click and deterministic continuation. Extra390x667 selected floor/drop-in/no-notes fixture passes. No external runtime requests/page errors in civic cases. Existing Voices off/on/off core outcomes/failure/lifetime/main-audio checks remain green.

Initial selector typo/timeout and fractional scroll-edge failure are retained. Diagnostic before margin: button bottom844.3125 in844px viewport; fixed bottom828.3125. Final reruns follow final CSS fix; prior passes are historical. JSONs/source manifest/verification receipts freeze exact source/log/screenshots and match live local /__build. Manual and preceding raw reports retain expected SHA256. No commit/push/publication/outreach/purchase. Owned lock released only after final integrity check.

Remaining: M4film, M1observed play, M2current facades/entrances/crossings/decorations, M5full accessibility/human acceptance, M6original recorded jazz/rights/quality/performance/release evidence. No physical phone, full screen-reader, human pacing/joy, real community event or surveyed access acceptance. Cross-tab last-writer-wins remains an existing limit. Full-game acceptance false.
'''
(c/'final.md').write_text(final,encoding='utf-8')
evidence=c/'evidence';evidence.mkdir(exist_ok=True)
for p in [*list((root/'artifacts').glob('civic*')),root/'artifacts/browser-results.json',root/'artifacts/voices-browser-results.json']:
    if p.is_file():shutil.copy2(p,evidence/p.name)
paths=[p for d in ['public','tests','scripts','docs'] for p in (root/d).rglob('*') if p.is_file()]+[root/p for p in ['README.md','package.json','.gitignore']]
manifest={p.relative_to(root).as_posix():{'sha256':sha(p),'bytes':p.stat().st_size} for p in sorted(paths)}
(c/'source_final.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
before=read(c/'source_after_review.json')
receipt={
 'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':source,
 'nodeTests':{'total':84,'passed':84,'failed':0},'syntax':'pass','gitDiffCheck':'pass',
 'browser':{'version':'155.0.8059.84','core':'complete pass','voices':'complete pass','civic':'complete pass','isolatedServers':True},
 'civicCoverage':'8 combinations distributed across320/390/1440 and both layouts, not each at every width',
 'unitJourneys':16,'shortViewport':{'width':390,'height':667,'scope':'one floor/drop-in/no-notes path'},
 'review':{'provider':'native Claude CLI via installed Kibitz','modelRequested':'claude-opus-5-5','effortRequested':'high','rc':0,'actualPrompts':1,'sha256':sha(c/'claude.md'),'usagePercent':'not exposed','cost':'not exposed'},
 'requestedArgonPin':'current with explicit KIBITZ_AGY_MODEL; separate default Flash check retained; no AGY prompt/substitution this round',
 'noReviewerSourceDrift':True,'driverChangesAfterReview':[k for k in manifest if before.get(k)!=manifest[k]],
 'inputSHA256':sha(c/'input.md'),'anchorSHA256':sha(c/'driver_anchor.md'),'manualReportSHA256':sha(manual),'precedingReviewSHA256':sha(prior),'finalManifestSHA256':sha(c/'source_final.json'),
 'livePreviewMatches':True,'roundsNotRun':['r1','r2','r4'],'fullGameComplete':False,'automation':'remain active hourly','next':'M4 original fictional movie shoot',
 'limits':['no physical phone','no full screen-reader speech audit','no human pacing','no actual community event','no current surveyed access/streetscape','no final recorded score/rights/quality acceptance','pre-existing cross-tab last-writer-wins'],
 'evidenceFiles':{p.name:sha(p) for p in sorted(evidence.iterdir()) if p.is_file()}
}
(c/'verification.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:receipt[k] for k in ['source','nodeTests','browser','review','livePreviewMatches','fullGameComplete','next']},indent=2))
