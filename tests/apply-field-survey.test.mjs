import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SURVEY_SCHEMA,
  BUILDING_TAGS,
  STREET_TAGS,
  BEGIN_MARKER,
  END_MARKER,
  normalizeHex,
  validateSurvey,
  footprintDistance,
  deriveOverrides,
  renderGdBlock,
  applyBlock,
  sourceLabel
} from '../scripts/apply-field-survey.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const cityData = JSON.parse(await readFile(path.join(root, 'godot/data/buildings.json'), 'utf8'));
const mainGd = await readFile(path.join(root, 'godot/main.gd'), 'utf8');
const fieldGuide = await readFile(path.join(root, 'tools/field-guide/index.html'), 'utf8');
const realId = String(cityData.buildings[0].id);
const PHOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD';

function fixtureSurvey() {
  return {
    schema: SURVEY_SCHEMA,
    exportedAt: '2026-10-19T18:22:00.000Z',
    origin: cityData.origin,
    stops: [
      { id: 'stop-01-comptons', x: 0, z: 0, survey: { shots: { 0: true }, tags: ['Red Brick', 'Green Bike Lane', 'Mystery Tag'], notes: 'private note about a neighbor', photos: [{ filename: 'a.jpg', dataUrl: PHOTO }] } },
      { id: 'stop-02-empty', x: 36, z: -12, survey: { shots: {}, tags: [], notes: '', photos: [] } }
    ],
    buildings: {
      [realId]: { tags: ['Iron Fire Escape', 'Rooftop Water Tank'], facade: '#AABBCC', trim: 'not-a-color', notes: 'private', photos: [{ filename: 'b.jpg', dataUrl: PHOTO }] },
      '999999.0000000': { tags: ['Red Brick'] },
      [String(cityData.wider_buildings[0].id)]: { photos: [{ filename: 'c.jpg', dataUrl: PHOTO }] }
    }
  };
}

test('importer tag vocabulary matches godot/main.gd FIELD_SURVEY_TAG_STYLES and the Field Guide', () => {
  const styleBlock = mainGd.slice(mainGd.indexOf('const FIELD_SURVEY_TAG_STYLES'), mainGd.indexOf(BEGIN_MARKER));
  const styleKeys = [...styleBlock.matchAll(/^\t"([^"]+)": \{/gm)].map(m => m[1]);
  assert.deepEqual(styleKeys, BUILDING_TAGS, 'FIELD_SURVEY_TAG_STYLES keys must equal BUILDING_TAGS in the same order');
  for (const tag of [...BUILDING_TAGS, ...STREET_TAGS]) {
    assert.ok(fieldGuide.includes(JSON.stringify(tag)), `tools/field-guide/index.html must offer tag ${tag}`);
  }
  assert.ok(BUILDING_TAGS.every(t => /^[\x20-\x7e]+$/.test(t)), 'tags stay ASCII so they render in the Godot Web font');
});

test('normalizeHex and validateSurvey accept only well-formed input', () => {
  assert.equal(normalizeHex('#AABBCC'), '#aabbcc');
  assert.equal(normalizeHex('9c4a3a'), '#9c4a3a');
  assert.equal(normalizeHex('#abc'), null);
  assert.equal(normalizeHex('red'), null);
  assert.equal(normalizeHex(42), null);
  assert.deepEqual(validateSurvey(fixtureSurvey()), []);
  assert.ok(validateSurvey({ schema: 'something-else' }).length > 0);
  assert.ok(validateSurvey([]).length > 0);
  assert.ok(validateSurvey({ schema: SURVEY_SCHEMA, buildings: [] }).length > 0);
  assert.throws(() => deriveOverrides({ schema: 'nope' }, cityData), /Invalid field survey/);
});

test('deriveOverrides maps stop and building tags to real sf16_bldgid footprints without photos or notes', () => {
  const { overrides, report } = deriveOverrides(fixtureSurvey(), cityData);
  const known = new Set([...cityData.buildings, ...cityData.wider_buildings].map(b => String(b.id)));
  for (const id of Object.keys(overrides)) assert.ok(known.has(id), `${id} must be a measured footprint`);
  const own = overrides[realId];
  assert.ok(own, 'the explicitly surveyed building gets an override');
  assert.ok(own.tags.includes('Iron Fire Escape') && own.tags.includes('Rooftop Water Tank'));
  assert.equal(own.base, '#aabbcc');
  assert.equal(own.cornice, undefined, 'invalid trim color is skipped');
  assert.ok(own.source === 'building' || own.source === 'building+stop');
  const matched = report.stopMatches['stop-01-comptons'];
  assert.ok(matched.length >= 1 && matched.length <= 4, 'stop tags reach at most 4 nearby footprints');
  const byId = new Map([...cityData.buildings, ...cityData.wider_buildings].map(b => [String(b.id), b]));
  for (const id of matched) {
    assert.ok(footprintDistance(0, 0, byId.get(id)) <= 28, `${id} is within 28 m of the stop`);
    assert.ok(overrides[id].tags.includes('Red Brick'), 'building-level stop tag propagates');
    assert.ok(!overrides[id].tags.includes('Green Bike Lane'), 'street-level tags are not building overrides');
  }
  assert.ok(!report.stopMatches['stop-02-empty'], 'untagged stops do not propagate');
  assert.deepEqual(report.unknownIds, ['999999.0000000']);
  assert.deepEqual(report.unknownTags, ['Mystery Tag']);
  assert.deepEqual(report.streetTags, ['Green Bike Lane']);
  assert.deepEqual(report.invalidColors, [`${realId}.trim`]);
  assert.equal(report.photosIgnored, 3);
  assert.equal(report.notesIgnored, 2);
  const serialized = JSON.stringify(overrides) + renderGdBlock(overrides, 'x');
  assert.ok(!serialized.includes('data:image') && !serialized.includes('private'), 'photos and notes never reach the overrides');
  assert.ok(!overrides[String(cityData.wider_buildings[0].id)], 'a photo-only building record adds no override');
  assert.deepEqual(own.tags, BUILDING_TAGS.filter(t => own.tags.includes(t)), 'tags are emitted in canonical order');
});

test('renderGdBlock/applyBlock rewrite only the generated block, idempotently, and main.gd ships it empty', () => {
  assert.equal(mainGd.split(BEGIN_MARKER).length, 2, 'exactly one BEGIN marker');
  assert.equal(mainGd.split(END_MARKER).length, 2, 'exactly one END marker');
  assert.equal(applyBlock(mainGd, renderGdBlock({}, '')), mainGd, 'committed main.gd carries the canonical empty block');
  const { overrides } = deriveOverrides(fixtureSurvey(), cityData);
  const label = sourceLabel('tools/field-guide/tenderloin-field-survey-2026-10-19.json', fixtureSurvey(), Object.keys(overrides).length);
  assert.match(label, /^tenderloin-field-survey-2026-10-19\.json \| exported 2026-10-19T18:22:00\.000Z \| \d+ buildings?$/);
  const block = renderGdBlock(overrides, label);
  const applied = applyBlock(mainGd, block);
  assert.ok(applied.includes(`\t"${realId}": {"tags": ["Iron Fire Escape", "Rooftop Water Tank"], "base": "#aabbcc", "source": `));
  assert.ok(applied.includes(`const FIELD_SURVEY_SOURCE := "${label}"`));
  assert.equal(applyBlock(applied, block), applied, 'applying the same survey twice is a no-op');
  assert.equal(applyBlock(applied, renderGdBlock({}, '')), mainGd, 'clearing restores the shipped source');
  const before = mainGd.slice(0, mainGd.indexOf(BEGIN_MARKER));
  const after = mainGd.slice(mainGd.indexOf(END_MARKER) + END_MARKER.length);
  assert.ok(applied.startsWith(before) && applied.endsWith(after), 'nothing outside the markers changes');
  assert.ok([...applied].every(ch => ch.codePointAt(0) < 0x2500 || ch === '•'), 'generated block adds no box-drawing or symbol glyphs');
  assert.throws(() => applyBlock('extends Node3D\n', block), /missing/);
  assert.throws(() => applyBlock(`${BEGIN_MARKER}\n${END_MARKER}\n${BEGIN_MARKER}\n${END_MARKER}\n`, block), /duplicate/);
});

test('CLI dry-runs by default and --apply writes only the target file', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'tl-field-survey-'));
  try {
    const surveyPath = path.join(dir, 'tenderloin-field-survey-2026-10-19.json');
    const targetGd = path.join(dir, 'main.gd');
    await writeFile(surveyPath, JSON.stringify(fixtureSurvey()));
    await writeFile(targetGd, mainGd);
    const script = path.join(root, 'scripts/apply-field-survey.mjs');
    const dry = spawnSync(process.execPath, [script, surveyPath, '--main', targetGd], { encoding: 'utf8' });
    assert.equal(dry.status, 0, dry.stderr);
    assert.match(dry.stdout, /Dry run/);
    assert.equal(await readFile(targetGd, 'utf8'), mainGd, 'dry run leaves main.gd untouched');
    const outJson = path.join(dir, 'overrides.json');
    const run = spawnSync(process.execPath, [script, surveyPath, '--main', targetGd, '--apply', '--out', outJson], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    const written = await readFile(targetGd, 'utf8');
    assert.ok(written.includes(`"${realId}": {`) && written !== mainGd);
    const report = JSON.parse(await readFile(outJson, 'utf8'));
    assert.equal(report.schema, 'tenderloin-redux.field-survey-overrides.v1');
    assert.ok(report.overrides[realId]);
    const cleared = spawnSync(process.execPath, [script, '--clear', '--main', targetGd], { encoding: 'utf8' });
    assert.equal(cleared.status, 0, cleared.stderr);
    assert.equal(await readFile(targetGd, 'utf8'), mainGd, '--clear restores the empty block');
    const bad = spawnSync(process.execPath, [script, path.join(dir, 'missing.json'), '--main', targetGd], { encoding: 'utf8' });
    assert.notEqual(bad.status, 0, 'a missing survey file fails visibly');
    assert.equal(await readFile(path.join(root, 'godot/main.gd'), 'utf8'), mainGd, 'the repository main.gd is never touched by tests');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
