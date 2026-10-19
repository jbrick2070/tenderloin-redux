import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  derive,
  deriveWiderBuildings,
  deriveStreets,
  deriveWiderStreets,
  deriveCulturalDistrict,
  deriveWestIntersections,
  WIDER_STREET_NAMES,
  project,
  origin
} from '../scripts/build-godot-data.mjs';

const raw = await readFile(new URL('../godot/data/source/buildings.geojson', import.meta.url));
const source = JSON.parse(raw);
const widerRaw = await readFile(new URL('../godot/data/source/buildings_tenderloin_west.geojson', import.meta.url));
const widerSource = JSON.parse(widerRaw);
const districtRaw = await readFile(new URL('../public/data/transgender-district.geojson', import.meta.url));
const districtSource = JSON.parse(districtRaw);
const districtMetaRaw = await readFile(new URL('../public/data/cultural-district-source.json', import.meta.url));
const districtMeta = JSON.parse(districtMetaRaw);
const output = JSON.parse(await readFile(new URL('../godot/data/buildings.json', import.meta.url)));

test('pinned source/vendor receipt and derived OSM streets match every actual input', async () => {
  const receipt = JSON.parse(await readFile(new URL('../godot/data/source_receipt.json', import.meta.url)));
  assert.equal(receipt.count, output.buildings.length);
  assert.equal(receipt.widerCount, output.wider_buildings.length);
  assert.equal(receipt.totalCount, output.buildings.length + output.wider_buildings.length);
  assert.ok(receipt.hashes['public/data/streets.osm.json']);
  assert.ok(receipt.hashes['godot/data/source/buildings_tenderloin_west.geojson']);
  assert.ok(receipt.hashes['public/data/transgender-district.geojson']);
  for (const [file, sha] of Object.entries(receipt.hashes)) {
    assert.equal(createHash('sha256').update(await readFile(new URL('../' + file, import.meta.url))).digest('hex'), sha, file);
  }
  const rawStreets = await readFile(new URL('../public/data/streets.osm.json', import.meta.url));
  const streets = JSON.parse(rawStreets);
  assert.equal(output.streets_sha256, createHash('sha256').update(rawStreets).digest('hex'));
  assert.deepEqual(output.streets, deriveStreets(streets));
  assert.deepEqual(output.wider_streets, deriveWiderStreets(streets));
  const streetNames = new Set(output.wider_streets.map(w => w.name));
  for (const expectedName of WIDER_STREET_NAMES) {
    assert.ok(streetNames.has(expectedName), `wider_streets must include ${expectedName}`);
  }
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

test('wider Tenderloin footprints, Transgender Cultural District boundary, and west intersections preserve exact city/OSM geometry', () => {
  assert.equal(output.wider_source_sha256, createHash('sha256').update(widerRaw).digest('hex'));
  const derivedWider = deriveWiderBuildings(widerSource, output.buildings);
  assert.equal(derivedWider.length, 130);
  assert.deepEqual(output.wider_buildings, derivedWider);
  const openingIds = new Set(output.buildings.map(b => b.id));
  let widerHoles = 0;
  for (const b of output.wider_buildings) {
    assert.ok(!openingIds.has(b.id), `wider_buildings must not duplicate opening building ${b.id}`);
    for (const polygon of b.polygons) {
      widerHoles += polygon.rings.length - 1;
      const expected = ringArea(polygon.rings[0]) - polygon.rings.slice(1).reduce((s, r) => s + ringArea(r), 0);
      let actual = 0;
      for (let n = 0; n < polygon.triangles.length; n += 3) {
        const indexes = polygon.triangles.slice(n, n + 3);
        actual += ringArea(indexes.map(k => polygon.vertices[k]));
      }
      assert.ok(Math.abs(actual - expected) < 1e-6, b.id);
    }
  }
  assert.ok(widerHoles > 0, 'wider Tenderloin footprints retain inner courtyard holes');
  assert.equal(output.cultural_district_sha256, createHash('sha256').update(districtRaw).digest('hex'));
  assert.deepEqual(output.cultural_district, deriveCulturalDistrict(districtSource, districtMeta));
  assert.equal(output.cultural_district.name, 'Transgender Cultural District');
  assert.equal(output.cultural_district.dataset_id, '5xmc-5bjj');
  assert.equal(output.cultural_district.polygons[0].rings[0].length, districtSource.features[0].geometry.coordinates[0][0].length - 1);
  assert.deepEqual(output.west_intersections, deriveWestIntersections());
  assert.equal(output.west_intersections.length, 3);
  assert.equal(output.history_stops.length, 2);
});

test('data derivation fails visibly on unknown/missing geometry and wrong units', () => {
  for (const mutate of [s => s.features[0].geometry.type = 'Polygon', s => s.features[0].properties.hgt_mediancm = 'missing',
    s => s.features[0].properties.hgt_mediancm = '241900', s => s.features[0].geometry.coordinates[0][0].pop(),
    s => s.features.push(s.features[0])]) {
    const s = structuredClone(source); mutate(s); assert.throws(() => derive(s));
  }
  for (const mutateDistrict of [
    d => d.features = [],
    d => d.features[0].properties.district_name = 'Wrong',
    d => d.features[0].geometry.coordinates[0][0].pop(),
    d => d.features[0].geometry.coordinates[0][0][0] = [0, 0]
  ]) {
    const d = structuredClone(districtSource);
    mutateDistrict(d);
    assert.throws(() => deriveCulturalDistrict(d, districtMeta));
  }
});

test('godot/data/neighborhood_voices.json matches public/experiments/neighborhood-voices.json and verified M5 schema', async () => {
  const { readRecords } = await import('../public/experiments/neighborhood-voices.js');
  const browserVoicesRaw = await readFile(new URL('../public/experiments/neighborhood-voices.json', import.meta.url), 'utf8');
  const godotVoicesRaw = await readFile(new URL('../godot/data/neighborhood_voices.json', import.meta.url), 'utf8');
  assert.ok(Buffer.byteLength(godotVoicesRaw, 'utf8') <= 8192);
  const browserVoices = JSON.parse(browserVoicesRaw);
  const godotVoices = JSON.parse(godotVoicesRaw);
  assert.deepEqual(godotVoices, browserVoices);
  const parsed = readRecords(godotVoices);
  assert.equal(parsed.checkedAt, '2026-10-18');
  assert.deepEqual(parsed.records.map(r => r.id), ['tndc', 'glide', 'larkin']);
});

