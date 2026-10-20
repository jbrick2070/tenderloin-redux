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
import { deriveStreetTrees, isPlantedTree, splitSpecies, OUTLINE_SNAP_OUT_M, OUTLINE_SNAP_MAX_INSIDE_M } from '../scripts/build-street-trees.mjs';
import { deriveLidar2023, currentFootprints, rooferFootprints, rooferPass2Footprints, rooferSkipped, osmCandidates, PARAMS as LIDAR_PARAMS } from '../scripts/build-lidar-2023.mjs';

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

test('M6 release quality: docs/ASSETS.md, godot/data/SOURCES.md, export_presets.cfg, and license files cover all Godot shipped assets with zero external network or legacy media', async () => {
  const { existsSync } = await import('node:fs');
  const assetsDoc = await readFile(new URL('../docs/ASSETS.md', import.meta.url), 'utf8');
  const sourcesDoc = await readFile(new URL('../godot/data/SOURCES.md', import.meta.url), 'utf8');
  const exportCfg = await readFile(new URL('../godot/export_presets.cfg', import.meta.url), 'utf8');
  const engineLicense = await readFile(new URL('../godot/ENGINE_LICENSE.txt', import.meta.url), 'utf8');
  const earcutLicense = await readFile(new URL('../scripts/vendor/earcut.LICENSE', import.meta.url), 'utf8');
  const mainGd = await readFile(new URL('../godot/main.gd', import.meta.url), 'utf8');

  for (const requiredAssetToken of [
    'godot/main.gd',
    'godot/data/buildings.json',
    'godot/data/SOURCES.md',
    'godot/data/source_receipt.json',
    'godot/data/source/metadata.json',
    'godot/data/source/method.pdf',
    'godot/data/neighborhood_voices.json',
    'scripts/vendor/earcut.js',
    'scripts/vendor/earcut.LICENSE',
    'godot/ENGINE_LICENSE.txt',
    'tenderloin-redux-godot-afternoon.svg',
    'PDDL 1.0',
    'ODbL 1.0',
    'ISC'
  ]) {
    assert.ok(assetsDoc.includes(requiredAssetToken), `docs/ASSETS.md must document ${requiredAssetToken}`);
  }

  const godotSection = assetsDoc.slice(assetsDoc.indexOf('| Godot 4.7.2 track'));
  const backtickPaths = [...godotSection.matchAll(/`((?:godot|scripts)\/[^`\s*]+)`/g)].map(m => m[1]);
  assert.ok(backtickPaths.length >= 15, 'docs/ASSETS.md Godot section must list concrete godot/ and scripts/ paths');
  for (const relPath of backtickPaths) {
    if (relPath.endsWith('/')) continue;
    const fullUrl = new URL('../' + relPath, import.meta.url);
    assert.ok(existsSync(fullUrl), `Documented path ${relPath} in docs/ASSETS.md must exist on disk`);
  }

  assert.ok(sourcesDoc.includes('ynuv-fyni') && sourcesDoc.includes('5xmc-5bjj') && sourcesDoc.includes('ODbL 1.0'), 'godot/data/SOURCES.md must document ynuv-fyni, 5xmc-5bjj, and ODbL 1.0');
  assert.ok(engineLicense.includes('Godot Engine') && engineLicense.includes('MIT'), 'godot/ENGINE_LICENSE.txt must retain Godot MIT license');
  assert.ok(earcutLicense.includes('ISC License') && earcutLicense.includes('Mapbox'), 'scripts/vendor/earcut.LICENSE must retain Mapbox ISC license');

  const incMatch = exportCfg.match(/include_filter="([^"]+)"/);
  const excMatch = exportCfg.match(/exclude_filter="([^"]+)"/);
  assert.ok(incMatch, 'export_presets.cfg must declare include_filter');
  assert.ok(excMatch, 'export_presets.cfg must declare exclude_filter');
  const includedFiles = incMatch[1].split(',').map(s => s.trim()).filter(Boolean);
  assert.deepEqual(includedFiles, ['data/buildings.json', 'data/neighborhood_voices.json', 'data/street_trees.json', 'data/lidar_2023.json', 'ENGINE_LICENSE.txt']);
  for (const relPath of includedFiles) {
    const buf = await readFile(new URL('../godot/' + relPath, import.meta.url));
    assert.ok(buf.byteLength > 0, `godot/${relPath} must exist and be non-empty`);
  }
  assert.ok(excMatch[1].includes('data/source/*') && excMatch[1].includes('tests/*'), 'export_presets.cfg must exclude raw source and test files from runtime Web export');

  assert.ok(
    !/HTTPRequest|HTTPClient|WebSocketPeer|StreamPeerTCP|PacketPeerUDP|ENetMultiplayerPeer|WebRTCPeerConnection|OS\.shell_open|fetch\s*\(|XMLHttpRequest|sendBeacon|new\s+WebSocket|EventSource/.test(mainGd),
    'godot/main.gd must not use runtime network client classes or browser network calls'
  );
  assert.ok(!/TenderVoice/i.test(mainGd), 'godot/main.gd must not reference legacy TenderVoice');
});

test('real street trees come unmodified from DataSF tkzw-k3nq and are re-derivable offline', async () => {
  const rawBytes = await readFile(new URL('../godot/data/source/street_trees_tkzw-k3nq.json', import.meta.url));
  const records = JSON.parse(rawBytes);
  const derived = JSON.parse(await readFile(new URL('../godot/data/street_trees.json', import.meta.url), 'utf8'));
  assert.equal(derived.format, 'tenderloin-redux.street-trees.v1');
  assert.equal(derived.source.license, 'PDDL 1.0');
  assert.equal(derived.source.raw_sha256, createHash('sha256').update(rawBytes).digest('hex'), 'derived file records the retained raw source hash');
  assert.deepEqual(derived.origin, output.origin, 'trees use the buildings.json projection origin');
  const lidar = JSON.parse(await readFile(new URL('../godot/data/lidar_2023.json', import.meta.url), 'utf8'));
  const { trees, report } = deriveStreetTrees(records, output, lidar);
  assert.deepEqual(derived.trees, trees, 'street_trees.json matches a fresh offline derivation');
  assert.equal(derived.report.kept, trees.length);
  assert.ok(trees.length > 300, 'hundreds of real trees inside the modeled area');
  assert.ok(report.notTree > 0 && records.filter(r => !isPlantedTree(r)).every(r => /potential site/i.test(r.species)), 'only empty "Potential Site" basins are dropped as non-trees');
  const byId = new Map(records.map(r => [String(r.treeid), r]));
  for (const tree of trees) {
    const rec = byId.get(tree.id);
    assert.ok(rec, `tree ${tree.id} exists in the city record`);
    const [x, z] = project([Number(rec.longitude), Number(rec.latitude)]);
    if (tree.moved_m) {
      assert.ok(Math.abs(Math.hypot(x - tree.x, z - tree.z) - tree.moved_m) < 0.02 && tree.moved_m <= OUTLINE_SNAP_OUT_M + OUTLINE_SNAP_MAX_INSIDE_M + 0.01, `tree ${tree.id} records how far it moved out of a post-2010 outline`);
    } else {
      assert.ok(Math.abs(x - tree.x) < 0.006 && Math.abs(z - tree.z) < 0.006, `tree ${tree.id} keeps its surveyed position`);
    }
    assert.equal(tree.species, splitSpecies(rec.species).common);
  }
  const coords = new Map();
  for (const tree of trees) {
    const rec = byId.get(tree.id);
    const key = rec.latitude + ',' + rec.longitude;
    assert.ok(!coords.has(key), `trees ${coords.get(key)} and ${tree.id} are not stacked on one coordinate`);
    coords.set(key, tree.id);
  }
  assert.ok(report.stackedPlaceholders > 0 && report.movedOutOfOutline > 0, 'address-placeholder stacks are dropped and outline-edge trees are moved, both reported');
});

test('2023 LiDAR roofs and post-2010 buildings are re-derivable offline from retained sources', async () => {
  const rooferBytes = await readFile(new URL('../godot/data/source/roofer_lod13.city.jsonl', import.meta.url));
  const retryBytes = await readFile(new URL('../godot/data/source/roofer_lod13_pass2.city.jsonl', import.meta.url));
  const osmBytes = await readFile(new URL('../godot/data/source/osm_buildings.json', import.meta.url));
  const manifestBytes = await readFile(new URL('../godot/data/source/lidar_ept_manifest.json', import.meta.url));
  const osm = JSON.parse(osmBytes);
  const lidar = JSON.parse(await readFile(new URL('../godot/data/lidar_2023.json', import.meta.url), 'utf8'));
  const sha = b => createHash('sha256').update(b).digest('hex');
  assert.equal(lidar.format, 'tenderloin-redux.lidar-2023.v1');
  assert.equal(lidar.source.roofer.output_sha256, sha(rooferBytes), 'records the retained Roofer output hash');
  assert.equal(lidar.source.roofer.pass2_output_sha256, sha(retryBytes), 'records the retained Roofer pass-2 output hash');
  assert.equal(lidar.source.osm.sha256, sha(osmBytes), 'records the retained OSM response hash');
  assert.equal(lidar.source.lidar.manifest_sha256, sha(manifestBytes), 'records the LiDAR download manifest hash');
  assert.match(lidar.source.lidar.license, /Public Domain/);
  assert.match(lidar.source.osm.license, /ODbL 1\.0/);
  assert.deepEqual(lidar.origin, output.origin);
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.dataset, 'USGS 3DEP CA_SanFrancisco_1_B23');
  assert.ok(manifest.nodes.length > 500 && manifest.nodes.every(n => /^[0-9a-f]{64}$/.test(n.sha256)), 'every downloaded LiDAR node is listed with a SHA-256');

  const fresh = deriveLidar2023(output, osm, rooferBytes.toString('utf8'), retryBytes.toString('utf8'));
  assert.deepEqual(lidar.roofs, fresh.roofs, 'roofs match a fresh derivation');
  assert.deepEqual(lidar.additions, fresh.additions, 'additions match a fresh derivation');
  assert.deepEqual(lidar.superseded, fresh.superseded, 'superseded footprints match a fresh derivation');
  const all2010 = [...output.buildings, ...output.wider_buildings];
  assert.equal(Object.keys(lidar.roofs).length, all2010.length, 'all 188 footprints have a LiDAR roof record');

  // Pass 2 covers exactly the footprints pass 1 skipped plus the rebuilt-site OSM outlines.
  const skipped = rooferSkipped(rooferBytes.toString('utf8'));
  const pass2 = rooferPass2Footprints(output, osm, rooferBytes.toString('utf8'));
  const pass2Ids = retryBytes.toString('utf8').trim().split('\n').slice(1).flatMap(l => Object.values(JSON.parse(l).CityObjects).filter(o => o.type === 'Building').map(o => String(o.attributes.bid))).sort();
  assert.deepEqual(pass2Ids, [...pass2.ids].sort(), 'Roofer pass 2 ran on exactly the skipped footprints and rebuilt-site outlines');
  assert.deepEqual(lidar.source.roofer.pass2_ids, pass2.ids);
  assert.ok(skipped.every(id => pass2.ids.includes(id)));
  for (const id of skipped) assert.ok(lidar.roofs[id]?.roofer_pass2 && Math.abs(lidar.roofs[id].median_m - lidar.roofs[id].city_height_m) < 1.0, `retried roof ${id} matches its 2010 height within 1 m`);

  // Roofer ran on exactly the 2010 footprints plus the OSM candidates.
  const rooferIds = new Set(rooferBytes.toString('utf8').trim().split('\n').slice(1).flatMap(l => Object.values(JSON.parse(l).CityObjects).filter(o => o.type === 'Building').map(o => String(o.attributes.bid))));
  assert.deepEqual([...rooferIds].sort(), rooferFootprints(output, osm).features.map(f => f.properties.bid).sort());

  // The city's 2010 survey and the 2023 LiDAR agree on ground and median roof height for most buildings.
  const kept = all2010.filter(b => !lidar.superseded.some(s => s.id === b.id));
  const dH = kept.map(b => Math.abs(lidar.roofs[b.id].median_m - b.height_m)).sort((a, b) => a - b);
  assert.ok(dH[Math.floor(dH.length * 0.8)] < 1.5, '80% of standing 2010 footprints match the 2023 LiDAR median roof within 1.5 m');
  assert.ok(all2010.every(b => lidar.roofs[b.id].ground_m === Math.round(b.ground_m_navd88 * 100) / 100), 'heights are measured from the city ground');
  const dG = all2010.map(b => lidar.roofs[b.id].lidar_ground_m - b.ground_m_navd88).sort((a, b) => a - b);
  assert.ok(Math.abs(dG[dG.length >> 1]) < 1.0 && dG[0] > -6.5, 'Roofer ground agrees with the city ground (median within 1 m; lower on sloped blocks)');

  const pip = (x, z, r) => { let i = false; for (let a = 0, b = r.length - 1; a < r.length; b = a++) { const [xa, za] = r[a], [xb, zb] = r[b]; if ((za > z) !== (zb > z) && x < (xb - xa) * (z - za) / (zb - za) + xa) i = !i; } return i; };
  const segd = (p, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz; const t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L)) : 0; return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz); };
  const nearOrInside = (p, polys) => polys.some(pg => pip(p[0], p[1], pg.rings[0]) || pg.rings[0].some((a, i) => segd(p, a, pg.rings[0][(i + 1) % pg.rings[0].length]) < 0.3));
  for (const [id, roof] of Object.entries(lidar.roofs)) {
    const b = all2010.find(x => x.id === id);
    for (const m of roof.masses) {
      assert.ok(m.h >= b.height_m + LIDAR_PARAMS.minRiseM - 1e-9 && m.area_m2 >= LIDAR_PARAMS.minMassAreaM2, `${id} raised parts rise above the 2010 median and are not specks`);
      assert.ok(m.triangles.length >= 3 && m.triangles.length % 3 === 0 && m.vertices.length === m.rings.flat().length, `${id} raised parts are triangulated`);
      for (const v of m.vertices) assert.ok(nearOrInside(v, b.polygons), `${id} raised part vertex ${v} stays inside its own footprint`);
    }
  }

  // Buildings the 2010 layer lacks are OSM buildings the 2023 LiDAR confirms.
  const byName = Object.fromEntries(lidar.additions.map(a => [a.name || a.address || a.id, a]));
  for (const [label, address, levels] of [['361 TL Residences', '361 Turk Street', '8'], ['145 TL Residences', '145 Leavenworth Street', '8'], ['180 Jones Street', '180 Jones Street', '9']]) {
    const a = byName[label];
    assert.ok(a && a.address === address && a.osm_levels === levels && a.covered_by_2010_pct < 5, `${address} is missing from the 2010 footprints`);
    assert.ok(a.height_m > Number(levels) * 2.8 && a.height_m < Number(levels) * 4.0 + 2, `${address}: LiDAR height ${a.height_m} m fits ${levels} storeys`);
  }
  assert.ok(byName.Prism && byName.Prism.address === '1028 Market Street' && byName.Prism.reason.startsWith('replaces') && Math.abs(byName.Prism.height_m / Number(byName.Prism.osm_levels) - 3) < 0.5, 'Prism (1028 Market St, 13 storeys) replaced a ~10 m 2010 footprint');
  assert.ok(byName['993 Market Street'] && byName['993 Market Street'].osm_levels === '1' && byName['993 Market Street'].height_m < 8, '993 Market St is now one storey');
  assert.equal(lidar.additions.length, 8);
  assert.ok(byName['Livat Mall'] && byName['Livat Mall'].covered_by_2010_pct < 5 && byName['Livat Mall'].height_m > 20, 'Livat Mall (945 Market St) is missing from 2010 and ~28 m tall in 2023');
  assert.ok(byName.Serif && byName.Serif.height_m > 30 && Math.abs(byName.Serif.height_m - Number(byName.Serif.osm_height_m)) < 3, 'Serif (960 Market St) LiDAR height agrees with its OSM height within 3 m');
  assert.equal(lidar.superseded.length, 5);
  for (const s of lidar.superseded) {
    const by = lidar.additions.find(a => a.id === s.by);
    assert.ok(by && by.reason.startsWith('replaces') && s.inside_pct >= LIDAR_PARAMS.supersededInsidePct && Math.abs(s.lidar_median_m - s.city_height_m) > LIDAR_PARAMS.changedHeightDiffM, `${s.id} lies inside rebuilt ${by?.name || s.by} and its 2023 height changed`);
  }
  for (const c of osmCandidates(output, osm)) {
    if (lidar.additions.some(a => a.id === c.id)) continue;
    assert.ok(c.covered * 100 >= LIDAR_PARAMS.additionMaxCoveredPct, `${c.id} is not an addition because 2010 footprints mostly cover it`);
  }
  const current = currentFootprints(output, lidar);
  assert.equal(current.length, output.buildings.length + output.wider_buildings.length - lidar.superseded.length + lidar.additions.length);
});
