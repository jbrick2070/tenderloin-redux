import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { districtGeometry, drawDistrict } from '../public/district.js';
import { BOUNDS, project } from '../public/core.js';

const raw = JSON.parse(readFileSync(new URL('../public/data/transgender-district.geojson', import.meta.url)));
const provenance = JSON.parse(readFileSync(new URL('../public/data/cultural-district-source.json', import.meta.url)));

test('complete city feature retains every projected coordinate and extends beyond the game', () => {
  const before = structuredClone(raw), polygons = districtGeometry(raw);
  assert.equal(provenance.licenseId, 'PDDL'); assert.equal(provenance.datasetId, '5xmc-5bjj');
  assert.deepEqual(raw, before);
  const positions = raw.features[0].geometry.coordinates;
  assert.equal(polygons[0][0].length, 17);
  for (let p = 0; p < polygons.length; p++) for (let r = 0; r < polygons[p].length; r++) {
    assert.deepEqual(polygons[p][r], positions[p][r].map(([lon, lat]) => project({ lat, lon })));
  }
  assert.ok(polygons.flat(2).some(p => p.y < BOUNDS.top));
  assert.ok(polygons.flat(2).some(p => p.y > BOUNDS.bottom));
});

test('malformed, swapped, distant, excessive and unclosed city geometry is rejected', () => {
  for (const corrupt of [
    d => d.features.push(d.features[0]),
    d => d.features[0].properties.district_name = '<script>wrong district</script>',
    d => d.features[0].geometry.type = 'Polygon',
    d => d.features[0].geometry.coordinates = [],
    d => d.features[0].geometry.coordinates = Array(11).fill(d.features[0].geometry.coordinates[0]),
    d => d.features[0].geometry.coordinates[0] = Array(11).fill(d.features[0].geometry.coordinates[0][0]),
    d => d.features[0].geometry.coordinates[0][0][0] = [10, 37.78],
    d => d.features[0].geometry.coordinates[0][0][0] = [37.78, -122.41],
    d => d.features[0].geometry.coordinates[0][0][0] = [NaN, 37.78],
    d => d.features[0].geometry.coordinates[0][0].pop(),
    d => d.features[0].geometry.coordinates[0][0] = Array.from({ length: 1001 }, () => [-122.41, 37.78]),
  ]) {
    const data = structuredClone(raw); corrupt(data); assert.throws(() => districtGeometry(data));
  }
});

test('layer draws holes separately, clips only the view, and brackets drawing with canvas save/restore', () => {
  const data = structuredClone(raw), hole = [[-122.411, 37.783], [-122.4109, 37.783], [-122.4109, 37.7831], [-122.411, 37.783]];
  data.features[0].geometry.coordinates[0].push(hole);
  const polygons = districtGeometry(data), before = structuredClone(polygons), calls = [];
  const ctx = Object.fromEntries(['save','beginPath','rect','clip','setLineDash','moveTo','lineTo','closePath','fill','stroke','restore'].map(name => [name, (...args) => calls.push([name, ...args])]));
  drawDistrict(ctx, polygons, .1, BOUNDS);
  assert.deepEqual(calls[0], ['save']); assert.deepEqual(calls.at(-1), ['restore']);
  assert.equal(calls.filter(c => c[0] === 'moveTo').length, 2);
  assert.ok(calls.some(c => c[0] === 'fill' && c[1] === 'evenodd'));
  assert.ok(calls.some(c => c[0] === 'clip')); assert.deepEqual(polygons, before);
});
