import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { derive, deriveStreets, project, origin } from '../scripts/build-godot-data.mjs';

const raw = await readFile(new URL('../godot/data/source/buildings.geojson', import.meta.url));
const source = JSON.parse(raw);
const output = JSON.parse(await readFile(new URL('../godot/data/buildings.json', import.meta.url)));

test('pinned source/vendor receipt and derived OSM streets match every actual input', async () => {
  const receipt = JSON.parse(await readFile(new URL('../godot/data/source_receipt.json', import.meta.url)));
  assert.ok(receipt.hashes['public/data/streets.osm.json']);
  for (const [file, sha] of Object.entries(receipt.hashes)) {
    assert.equal(createHash('sha256').update(await readFile(new URL('../' + file, import.meta.url))).digest('hex'), sha, file);
  }
  const rawStreets = await readFile(new URL('../public/data/streets.osm.json', import.meta.url));
  const streets = JSON.parse(rawStreets);
  assert.equal(output.streets_sha256, createHash('sha256').update(rawStreets).digest('hex'));
  assert.deepEqual(output.streets, deriveStreets(streets));
  assert.deepEqual(output.street_source, streets.source);
});

test('city geometry retains every original ID, polygon, hole and coordinate at metre scale', () => {
  const derived = derive(source);
  assert.equal(derived.buildings.length, 58);
  assert.equal(output.source_sha256, createHash('sha256').update(raw).digest('hex'));
  assert.deepEqual(output.buildings, derived.buildings);
  let holes = 0;
  source.features.forEach((f, i) => {
    const b = output.buildings[i];
    assert.equal(b.id, f.properties.sf16_bldgid);
    assert.equal(b.polygons.length, f.geometry.coordinates.length);
    f.geometry.coordinates.forEach((polygon, j) => {
      holes += polygon.length - 1;
      assert.deepEqual(b.polygons[j].rings, polygon.map(r => r.slice(0, -1).map(project)));
    });
  });
  assert.ok(holes > 0, 'actual source exercises courtyards');
  assert.deepEqual(project([origin.lon, origin.lat]), [0, 0]);
  assert.ok(Math.abs(project([origin.lon, origin.lat + .001])[1] + 111.32) < 1e-6);
});

const ringArea = ring => Math.abs(ring.reduce((sum, a, i) => { const b = ring[(i + 1) % ring.length]; return sum + a[0] * b[1] - b[0] * a[1]; }, 0)) / 2;
test('all roof triangles preserve footprint area excluding courtyards; heights use above-ground centimetres', () => {
  output.buildings.forEach((b, i) => {
    const p = source.features[i].properties;
    assert.equal(b.height_m, Number(p.hgt_mediancm) / 100);
    assert.notEqual(b.height_m, Number(p.p2010_zmaxn88ft));
    assert.equal(b.data_as_of, p.data_as_of);
    for (const polygon of b.polygons) {
      const expected = ringArea(polygon.rings[0]) - polygon.rings.slice(1).reduce((s, r) => s + ringArea(r), 0);
      let actual = 0;
      for (let n = 0; n < polygon.triangles.length; n += 3) {
        const indexes = polygon.triangles.slice(n, n + 3);
        assert.ok(indexes.every(k => Number.isInteger(k) && k >= 0 && k < polygon.vertices.length));
        actual += ringArea(indexes.map(k => polygon.vertices[k]));
      }
      assert.ok(Math.abs(actual - expected) < 1e-6, b.id);
    }
  });
});

test('data derivation fails visibly on unknown/missing geometry and wrong units', () => {
  for (const mutate of [s => s.features[0].geometry.type = 'Polygon', s => s.features[0].properties.hgt_mediancm = 'missing',
    s => s.features[0].properties.hgt_mediancm = '241900', s => s.features[0].geometry.coordinates[0][0].pop(),
    s => s.features.push(s.features[0])]) {
    const s = structuredClone(source); mutate(s); assert.throws(() => derive(s));
  }
});
