// Offline, reproducible derivation of real street trees for the Godot scene; no network at runtime.
//
// Source: San Francisco Street Tree Inventory (DataSF tkzw-k3nq, Public Works / Bureau of Urban
// Forestry, PDDL 1.0), retained unmodified in godot/data/source/street_trees_tkzw-k3nq.json.
// Fetched with:
//   https://data.sf.gov/resource/tkzw-k3nq.json?$where=latitude between '37.7812' and '37.7850'
//     and longitude between '-122.4172' and '-122.4078'&$order=treeid&$limit=5000
//
// Each planted tree is projected with the same local-metre origin as godot/data/buildings.json.
// "Potential Site" records (empty planting basins) are not trees and are dropped, as are records
// that land inside a measured building footprint or outside the modeled building area.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { project } from './build-godot-data.mjs';

export const TREE_SOURCE_PATH = 'godot/data/source/street_trees_tkzw-k3nq.json';
export const TREE_OUTPUT_PATH = 'godot/data/street_trees.json';
export const AREA_MARGIN_M = 15;

function pointInRing(x, z, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i];
    const [xj, zj] = ring[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi || 1e-12) + xi) inside = !inside;
  }
  return inside;
}

function insideFootprint(x, z, buildings) {
  for (const b of buildings) {
    for (const poly of b.polygons || []) {
      const rings = poly.rings || [];
      if (!rings.length || !pointInRing(x, z, rings[0])) continue;
      if (!rings.slice(1).some(hole => pointInRing(x, z, hole))) return String(b.id);
    }
  }
  return '';
}

function modeledArea(buildings) {
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (const b of buildings) for (const poly of b.polygons || []) for (const [x, z] of poly.rings[0] || []) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }
  return { minX: minX - AREA_MARGIN_M, maxX: maxX + AREA_MARGIN_M, minZ: minZ - AREA_MARGIN_M, maxZ: maxZ + AREA_MARGIN_M };
}

/** "Platanus x hispanica :: Sycamore, London Plane" -> { scientific, common } */
export function splitSpecies(raw) {
  const [sci = '', common = ''] = String(raw || '').split('::').map(s => s.trim());
  return { scientific: sci, common: common || sci };
}

export function isPlantedTree(rec) {
  const species = String(rec.species || '');
  return rec.planttype === 'Tree' && !/potential site|vacant/i.test(species);
}

export function deriveStreetTrees(records, cityData) {
  const buildings = [...(cityData.buildings || []), ...(cityData.wider_buildings || [])];
  const area = modeledArea(buildings);
  const report = { raw: records.length, notTree: 0, outsideArea: 0, insideFootprint: [], kept: 0 };
  const trees = [];
  const ids = new Set();
  for (const rec of records) {
    if (!isPlantedTree(rec)) { report.notTree++; continue; }
    const lat = Number(rec.latitude), lon = Number(rec.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) { report.notTree++; continue; }
    const [x, z] = project([lon, lat]);
    if (x < area.minX || x > area.maxX || z < area.minZ || z > area.maxZ) { report.outsideArea++; continue; }
    const hit = insideFootprint(x, z, buildings);
    if (hit) { report.insideFootprint.push({ treeid: String(rec.treeid), building: hit }); continue; }
    const id = String(rec.treeid);
    if (ids.has(id)) throw Error(`Duplicate treeid ${id}`);
    ids.add(id);
    const { scientific, common } = splitSpecies(rec.species);
    const dbh = Number(rec.mapdbh);
    trees.push({
      id,
      x: Math.round(x * 100) / 100,
      z: Math.round(z * 100) / 100,
      species: common,
      scientific,
      dbh_in: Number.isFinite(dbh) && dbh > 0 ? Math.round(dbh) : 0,
      site: String(rec.siteinfo || '').trim()
    });
  }
  trees.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
  report.kept = trees.length;
  return { trees, report };
}

async function main() {
  const rawBytes = await readFile(new URL('../' + TREE_SOURCE_PATH, import.meta.url));
  const records = JSON.parse(rawBytes);
  const cityData = JSON.parse(await readFile(new URL('../godot/data/buildings.json', import.meta.url), 'utf8'));
  const { trees, report } = deriveStreetTrees(records, cityData);
  const out = {
    format: 'tenderloin-redux.street-trees.v1',
    source: {
      dataset: 'San Francisco Street Tree Inventory (DataSF tkzw-k3nq)',
      url: 'https://data.sf.gov/d/tkzw-k3nq',
      license: 'PDDL 1.0',
      raw_file: TREE_SOURCE_PATH,
      raw_sha256: createHash('sha256').update(rawBytes).digest('hex'),
      data_as_of: records.reduce((m, r) => (r.data_as_of && r.data_as_of > m ? r.data_as_of : m), ''),
      fetched: '2026-10-19'
    },
    origin: cityData.origin,
    report: { ...report, insideFootprint: report.insideFootprint.length },
    trees
  };
  await writeFile(new URL('../' + TREE_OUTPUT_PATH, import.meta.url), JSON.stringify(out) + '\n');
  console.log(`street trees: ${report.raw} records -> ${report.kept} kept (${report.notTree} not trees, ${report.outsideArea} outside the modeled area, ${report.insideFootprint.length} inside a footprint)`);
  for (const f of report.insideFootprint) console.log(`  inside footprint: tree ${f.treeid} in ${f.building}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => { console.error(err.message); process.exitCode = 1; });
}
