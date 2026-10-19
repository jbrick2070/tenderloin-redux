from pathlib import Path
import hashlib, json, shutil, urllib.request, datetime

root = Path('C:/tenderloin-redux')
campaign = root / 'kibitz-runs/2026-10-18-m3-m5-neighborhood-voices/r3'
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p): return json.loads(p.read_text(encoding='utf-8-sig'))
expected = {'version': '0.10.0', 'fingerprint': 'b5b88c31516dd354034f94b370af84fd902daeb71c07c54f88cfa3cdd88e08dd'}
for filename in ['browser-results.json', 'voices-browser-results.json', 'voices-supplemental.json', 'voices-bfcache.json']:
    assert read(root / 'artifacts' / filename)['source'] == expected, filename
live = json.load(urllib.request.urlopen('http://127.0.0.1:4173/__build'))
assert live == expected
manual = root / 'docs/CLAUDE_MANUAL_REVIEW.md'
prior = root / 'kibitz-runs/2026-10-18-m3-host-afternoon/r3/claude.md'
assert sha(manual) == '3c6548df658ca822e91e1039e1c36a388c306ed1c2a56f513733d51c9267dae8'
assert sha(prior) == 'f4f88c970d1383c8f4a91c63e876ba0450b158622069e67225521fc99606de53'
assert read(campaign / 'source_review_comparison.json') == {'changed': [], 'new_files': []}
node_log = (root / 'artifacts/voices-node-final.log').read_text(encoding='utf-8-sig')
assert 'pass 78' in node_log and 'fail 0' in node_log
evidence = campaign / 'evidence'
evidence.mkdir(exist_ok=True)
files = list((root / 'artifacts').glob('voices*'))
files += [root / 'artifacts/browser-results.json', root / 'artifacts/close-voices-round.py']
for filename in files:
    if filename.is_file(): shutil.copy2(filename, evidence / filename.name)
paths = []
for directory in ['public', 'tests', 'scripts', 'docs']:
    paths += [p for p in (root / directory).rglob('*') if p.is_file()]
paths += [root / p for p in ['README.md', 'package.json', '.gitignore']]
manifest = {p.relative_to(root).as_posix(): {'sha256': sha(p), 'bytes': p.stat().st_size} for p in sorted(paths)}
manifest_file = campaign / 'source_final.json'
manifest_file.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
before = read(campaign / 'source_after_review.json')
changes = [name for name in manifest if name not in before or manifest[name] != before[name]]
receipt = {
 'at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'source': expected,
 'nodeTests': {'total': 78, 'passed': 78, 'failed': 0}, 'syntax': 'pass', 'gitDiffCheck': 'pass',
 'browser': {'version': '155.0.8059.84', 'core': 'complete pass', 'voices': 'complete pass', 'isolatedServers': True},
 'supplementalWidths': [320,390,1440], 'actualBFCachePersisted': read(root / 'artifacts/voices-bfcache.json')['persisted'],
 'optionalAudioPauseCommandMs': 0.5, 'audioLimit': 'synthetic nonshipped fixture, not acoustic latency or real voices',
 'review': {'provider': 'native Claude CLI via installed Kibitz', 'modelRequested': 'claude-opus-5-5', 'effortRequested': 'high', 'rc': 0, 'actualPrompts': 1, 'sha256': sha(campaign / 'claude.md'), 'usagePercent': 'not exposed', 'cost': 'not exposed'},
 'pinCorrection': 'Final metadata reports configured AGY Gemini3.8FlashHigh, not requested Gemini4ArgonHigh. Earlier driver statements superseded in judgment. No AGY call/substitution; authorized native Opus used.',
 'noReviewerSourceDrift': True, 'driverChangesAfterReview': changes,
 'inputSHA256': sha(campaign / 'input.md'), 'anchorSHA256': sha(campaign / 'driver_anchor.md'),
 'manualReportSHA256': sha(manual), 'precedingReviewSHA256': sha(prior), 'finalManifestSHA256': sha(manifest_file),
 'livePreviewMatches': live == expected, 'roundsNotRun': ['r1','r2','r4'],
 'fullGameComplete': False, 'automation': 'remain active hourly', 'next': 'M4 peaceful civic event then original film shoot',
 'limits': ['no physical phone', 'no full screen reader audit', 'no human pacing', 'no current streetscape survey', 'no operational service availability claim', 'no final recorded score acceptance'],
 'evidenceFiles': {p.name: sha(p) for p in sorted(evidence.iterdir()) if p.is_file()}
}
(campaign / 'verification.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
print(json.dumps({k:receipt[k] for k in ['source','nodeTests','browser','actualBFCachePersisted','review','livePreviewMatches','fullGameComplete','next']}, indent=2))
