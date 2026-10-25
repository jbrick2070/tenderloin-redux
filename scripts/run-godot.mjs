import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const cached = path.join(os.homedir(), '.cache/tenderloin-tools/godot-4.7.2/Godot_v4.7.2-stable_win64_console.exe');
const engine = process.env.GODOT_BIN || (existsSync(cached) ? cached : 'godot');
const args = process.argv.slice(2);
// The full native suite receives explicit, unique test paths before its guard.
// Other engine invocations (including export/import) keep their exact arguments.
if (args.includes('res://tests/study_test.gd') && args.includes('--test-suite')) {
  const runId = `${Date.now()}_${process.pid}`;
  const save = `user://godot_block_save_test_${runId}.json`;
  const settings = `user://godot_block_settings_test_${runId}.json`;
  if (args.some(a => a.startsWith('--godot-save-path=') || a.startsWith('--godot-settings-path='))) {
    throw new Error('The formal launcher owns unique test paths; use its generated isolation receipt.');
  }
  args.splice(args.indexOf('--test-suite'), 0, `--godot-save-path=${save}`, `--godot-settings-path=${settings}`);
  console.log('GODOT_TEST_ISOLATION ' + JSON.stringify({runId, save, settings, args}));
}
if (args.includes('--export-release')) mkdirSync('artifacts/godot-web', { recursive: true });
const result = spawnSync(engine, args, { stdio: 'inherit', windowsHide: true });
if (result.error) console.error('Set GODOT_BIN to your Godot 4.7.2 standard executable:', result.error.message);
process.exitCode = result.status ?? 1;
