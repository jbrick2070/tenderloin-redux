from pathlib import Path
import json,hashlib,zipfile
root=Path('C:/tenderloin-redux')
c=root/'kibitz-runs/2026-10-18-m4-civic-listening/r3'
paths=[]
for directory in ['public','tests','scripts','docs']:
    paths += [p for p in (root/directory).rglob('*') if p.is_file()]
paths += [root/p for p in ['README.md','package.json','.gitignore']]
manifest={p.relative_to(root).as_posix():{'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size} for p in sorted(paths)}
(c/'source_before.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
with zipfile.ZipFile(c/'source_before.zip','w',zipfile.ZIP_DEFLATED) as z:
    for p in paths:z.write(p,p.relative_to(root).as_posix())
doc=root/'docs/BUILD_CIVIC_REVIEW.md'
receipt=f'''# Explicit single-r3 scope before fanout

Creator authorizes one independent Kibitz partner per implementation round. Selected r3 only; r1/r2/r4 not run, not a completed four-round arc. Codex/SolHigh driver excluded. One actual native Claude CLI exact requested claude-opus-5-5/high prompt planned; authorized alternative to requested Argon.

Current explicit requested Argon check via KIBITZ_AGY_MODEL='Gemini 4 Argon (High)' passes in requested_argon_pin_check.txt. Runner default Flash pin separately recorded; not substituted. Historical actual Argon print-mode timeout/no report is not quota/permanent availability evidence and is not blindly repeated. No AGYOpus/Astra/purchase/large panel. Usage/cost only if exposed by provider.

Input docs/BUILD_CIVIC_REVIEW.md SHA256 {hashlib.sha256(doc.read_bytes()).hexdigest()}. Driver anchor written before fanout. Source archive {len(manifest)}files/public/tests/scripts/docs/package/README/gitignore before review, source comparison after. Single owned m4-civic-listening lock; no other writer/reviewer active. Review-only partner writes designated report. Preserve historical/manual reports and untracked user files. Driver runs tests; no outbound messages/publication/commit/push.
'''
(c/'scope_receipt.md').write_text(receipt,encoding='utf-8')
print(f'Frozen {len(manifest)} source files; scope and anchor precede fanout.')
