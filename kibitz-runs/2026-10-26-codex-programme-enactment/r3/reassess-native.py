"""Reassess retained full-suite evidence only. Never starts an engine or edits it."""
from pathlib import Path
import collections, datetime, hashlib, json, re

r = Path("C:/tenderloin-redux")
a = r / "artifacts/programme-enactment-20261026"
q = r / "kibitz-runs/2026-10-26-codex-programme-enactment/r3"
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
ready = json.loads((a / "final-ready.json").read_text(encoding="utf-8"))
original = json.loads((a / "final1/execution.json").read_text(encoding="utf-8"))
native = original["gates"]["native"]
assert original["rc"] == 1 and list(original["gates"]) == ["native"]
assert native["rc"] == 0 and native["clean"] and native["sources_unchanged"] and native["native_asfound_unchanged"]
assert {p: sha(r / p) for p in ready["source_hashes"]} == ready["source_hashes"]
assert sha(r / "artifacts/godot-web/index.pck") == ready["development_pack_sha256"]
assert sha(a / "final1/development-input-index.pck") == ready["development_pack_sha256"]
log = (a / "final1/native.log").read_text(encoding="utf-8")
assert not any(x in log for x in ["ERROR:", "WARNING:", "SCRIPT ERROR", "GODOT_STUDY_FAIL", ":PRIVATE"])
lines = log.splitlines()
exact = {
    "HELPER_BENCH_PASS:FORMAL": "HELPER_BENCH_PASS:FORMAL22layout-size/actualuiaccept/copiedtriptych/Keep/reload/input/quiet/manual/wholewords cases=22",
    "HABITAT_ROOM_PASS:FORMAL": "HABITAT_ROOM_PASS:FORMAL22layout-size/24maps/copied-art-film-seats/Keep/load/input/quiet",
    "DEPARTURE_PASS:FORMAL": "DEPARTURE_PASS:FORMAL22layout-size/24maps/Ready/Depart/still/Skip/Keep/load/quiet",
    "ORBITAL_COMMONS_PASS:FORMAL": "ORBITAL_COMMONS_PASS:FORMAL22layout-size/walk/invite/Stop/reader/Back/Pause/relocation/reset/quiet",
    "ENDING_FINALE_PASS:FORMAL": "ENDING_FINALE_PASS:FORMAL22layout-size/gather/recognition/memories/explore/return/Skip/relocation/caller",
    "PROGRAMME_GATHERING_PASS:FORMAL": "PROGRAMME_GATHERING_PASS:FORMAL:22:orders=16:pairs=11",
}
markers = {}
for token in ready["native_tokens"]:
    if token == "SMALL_PASS":
        continue  # Historical alias: validated as structured coverage below, never invented as a pass token.
    matches = [line for line in lines if line == exact[token]] if token in exact else re.findall(r"^" + re.escape(token) + r"(?=[:\s]|$).*$", log, re.M)
    assert len(matches) == 1, (token, matches)
    markers[token] = matches[0]
assert len(markers) == 27 and len(set(markers)) == 27
observed = re.findall(r"^SMALL_PASSIVE_CHECK \((\d+), (\d+)\) (mural|speaker|celeste|rook) body=.+$", log, re.M)
expected = [(str(w), str(h), kind) for w, h in [(520, 360), (559, 360), (520, 559), (559, 559)] for kind in ["mural", "speaker", "celeste", "rook"]]
assert collections.Counter(observed) == collections.Counter(expected)
assert len(re.findall(r"^SHORT_ACTIVITY_CHECK ", log, re.M)) == 54
assert not re.search(r"^SMALL_PASS(?=[:\s]|$)", log, re.M)
assert lines[-1].startswith("GODOT_STUDY_PASS:")
isolation = re.findall(r"^GODOT_TEST_ISOLATION (.+)$", log, re.M)
assert len(isolation) == 1
actual = json.loads(isolation[0])
assert actual == native["native_isolation"]
for field, prefix in [("save", "user://godot_block_save_test_"), ("settings", "user://godot_block_settings_test_")]:
    assert actual[field].startswith(prefix) and re.fullmatch(r"[0-9]+_[0-9]+\.json", actual[field][len(prefix):])
    assert actual["args"].index("--godot-" + field + "-path=" + actual[field]) < actual["args"].index("--test-suite")
assert actual["save"].removeprefix("user://godot_block_save_test_") == actual["settings"].removeprefix("user://godot_block_settings_test_")
protected = Path("C:/Users/jeffr/AppData/Roaming/Godot/app_userdata/Tenderloin Redux \u2014 measured block/godot_block_save_v1.json")
assert protected.stat().st_size == 1272 and sha(protected) == "2b7d1e849b4820a1d6c49602930ac3e0b104a8aa132375837038bfef80f2e0e1"
bound = ["final1/native.log", "final1/execution.json", "final1/gate-exits.json", "final1/source-before.json", "final-ready.json", "final1/development-input-index.pck"]
receipt = {
    "utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "classification": "observer contract mismatch; retained full native execution accepted after source-grounded reassessment",
    "native_execution_accepted": True,
    "original_controller_failed": True,
    "original_native_rc": native["rc"],
    "original_native_seconds": native["seconds"],
    "native_clean": True,
    "original_frozen_inputs_unchanged": len(ready["source_hashes"]),
    "native_asfound_unchanged": True,
    "pass_marker_families": markers,
    "pass_marker_family_count": 27,
    "small_layout_coverage": {"historical_requirement_alias": "SMALL_PASS", "actual_marker": "SMALL_PASSIVE_CHECK", "combinations": observed, "count": 16, "short_activity_rows": 54, "requires_clean_full_suite_exit_and_final_pass": True, "literal_SMALL_PASS_exists": False},
    "required_check_family_count": 28,
    "native_isolation": actual,
    "bound_artifact_hashes": {p: sha(a / p) for p in bound},
    "observer_sha256": sha(Path(__file__)),
    "diagnosis_sha256": sha(q / "native-observer-diagnosis.md"),
    "not_a_rerun": True,
    "remaining": ["export", "check", "node", "browser", "capture/invariant inspection", "commit/push"],
    "full_all_five_accepted": False,
}
output = a / "native-reassessment.json"
assert not output.exists(), "Retain the existing reassessment instead of overwriting it"
output.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8", newline="\n")
print(json.dumps({"accepted_retained_native": True, "pass_marker_families": 27, "small_layout_combinations": 16, "required_check_families": 28, "frozen_inputs": len(ready["source_hashes"])}))
