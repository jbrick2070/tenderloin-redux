# Driver anchor - Field Guide pre-code r1

VERDICT: demonstrated local preview correctness/feedback issue. No implementation selected or product file edited.

CONFIRMED: scripts/serve-godot.mjs handles /field-guide and /field-guide/ as index.html without redirect; explicit geometry endpoint is /field-guide/buildings.json. tools/field-guide/index.html loadCityData fetches ./buildings.json, catches failed parsing and continues; updateProgressSummary uses allBuildings.length || 188. In isolated Chromium /field-guide requests /buildings.json (404), visibly renders no buildings, and says 188 footprints loaded. /field-guide/ requests correct endpoint (200) and shows geometry. Exact before evidence is artifacts/terra-field-guide-20261027/route-observation.json plus two screenshots; local served HTML/geometry hashes matched source. Private data was not used.

MUST: solve both supported URLs and truthful 0/error state; preserve existing field records and actual data, path behavior under static project subpath and interaction; retain original source/receipts. Test success, failure, empty/bad JSON, loaded counts and actual geometry without misleading fallback. Do not change public/workflows/deploy. Browser/headless/isolated evidence is not human/phone proof.

SHOULD: compare alternatives before choosing, check existing tests/server callers/query/hash and deployments, report attribution limits. Decline extra scope unless tied to the broken load/feedback. Storage quota behavior and geometry/data attribution are separate leads. Source and evidence only; no implementation yet.
