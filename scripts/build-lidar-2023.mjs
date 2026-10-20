// Offline, reproducible derivation of 2023 LiDAR roofs and post-2010 buildings; no network at runtime.
//
// Inputs, all retained in godot/data/source/:
//   - roofer_opening_lod13.city.jsonl: Roofer 1.0.0 LoD 1.3 reconstruction (CityJSONSeq) from the
//     2023 USGS 3DEP San Francisco LiDAR (CA_SanFrancisco_1_B23, public domain). The point download
//     is listed node-by-node with hashes in lidar_ept_opening_manifest.json.
//   - osm_buildings_opening.json: raw Overpass response with current OpenStreetMap building
//     outlines around the opening block (ODbL 1.0, © OpenStreetMap contributors).
//   - ../buildings.json: the 2010 city footprints (DataSF ynuv-fyni, PDDL 1.0).
//
// Steps (see godot/data/SOURCES.md for the exact commands):
//   1. py -3 -I scripts/lidar/fetch_ept.py <dir> ...      download the LiDAR octree nodes
//   2. python -I scripts/lidar/crop_points.py <dir> ...    crop + reproject into the game frame
//   3. node scripts/build-lidar-2023.mjs footprints <f>    write Roofer's footprint input
//   4. roofer ... --lod13 ...                              reconstruct (not bundled; GPL-3.0)
//   5. node scripts/build-lidar-2023.mjs                   write godot/data/lidar_2023.json
//
// The game keeps every 2010 footprint at its measured median height. This file adds:
//   roofs:      per 2010 footprint, the LiDAR roof parts that rise above that median
//               (penthouses, upper wings, towers), triangulated for the RooftopDetails mesh;
//   additions:  current OSM outlines that the 2023 LiDAR confirms but the 2010 layer lacks
//               (not covered at all, or covering 2010 footprints whose LiDAR height no longer
//               matches), at their LiDAR median height;
//   superseded: 2010 footprints that lie mostly inside such an addition. The game hides them and
//               leaves them out of collision, but keeps their ids and records.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import earcut, { flatten, deviation } from './vendor/earcut.js';
import { project, bbox } from './build-godot-data.mjs';

export const OSM_SOURCE_PATH = 'godot/data/source/osm_buildings_opening.json';
export const ROOFER_SOURCE_PATH = 'godot/data/source/roofer_opening_lod13.city.jsonl';
export const EPT_MANIFEST_PATH = 'godot/data/source/lidar_ept_opening_manifest.json';
export const OUTPUT_PATH = 'godot/data/lidar_2023.json';
export const OSM_QUERY = '[out:json][timeout:90];(way["building"](37.7816,-122.4128,37.7850,-122.4075);relation["building"](37.7816,-122.4128,37.7850,-122.4075););out geom;';
export const ROOFER_COMMAND = 'roofer -j 16 --bld-class 1 --grnd-class 2 --id-attribute bid --h-terrain-attribute h_terrain --h-terrain-strategy buffer_user --no-lod22 --lod13 --cj-translate 0 0 0 --srs EPSG:32610 points.laz footprints.geojson out';
export const PARAMS = {
  minMassAreaM2: 4,          // smaller roof parts are dropped (noise, chimneys)
  minRiseM: 1.0,             // a roof part must rise this far above the 2010 median to be drawn
  spikeAboveP70M: 12,        // small parts this far above the building's 70th-percentile roof...
  spikeMaxAreaM2: 25,        // ...and smaller than this are neighbor walls, cranes, or trees, not roofs
  candidateMaxCoveredPct: 85, // OSM outlines covered less than this by 2010 footprints are checked
  additionMaxCoveredPct: 40, // below this the OSM building is simply missing from 2010
  replacedHeightDiffM: 5,    // LiDAR vs 2010 median difference that marks a rebuilt site
  supersededInsidePct: 50,   // a 2010 footprint this much inside an addition is superseded
  minLidarBuildingM: 3       // an addition needs a LiDAR median roof at least this high
};

const round2 = v => Math.round(v * 100) / 100 + 0; // + 0 turns -0 into 0 so JSON round-trips exactly
const pip = (x, z, ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi || 1e-12) + xi) inside = !inside;
  }
  return inside;
};
const inRings = (x, z, rings) => pip(x, z, rings[0]) && !rings.slice(1).some(h => pip(x, z, h));
const ringArea = ring => {
  let s = 0;
  for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; s += a[0] * b[1] - b[0] * a[1]; }
  return Math.abs(s) / 2;
};
const ringsArea = rings => ringArea(rings[0]) - rings.slice(1).reduce((s, r) => s + ringArea(r), 0);

export function openingWindow() {
  const [x0, z1] = project([bbox[0], bbox[1]]);
  const [x1, z0] = project([bbox[2], bbox[3]]);
  return { x0, x1, z0, z1 };
}

/** Fraction of a polygon (1 m sample grid) that lies inside any of `others` (arrays of rings). */
export function coveredFraction(rings, others) {
  const xs = rings[0].map(p => p[0]), zs = rings[0].map(p => p[1]);
  let n = 0, hit = 0;
  for (let x = Math.floor(Math.min(...xs)); x <= Math.max(...xs); x += 1) {
    for (let z = Math.floor(Math.min(...zs)); z <= Math.max(...zs); z += 1) {
      if (!inRings(x + 0.5, z + 0.5, rings)) continue;
      n++;
      if (others.some(o => inRings(x + 0.5, z + 0.5, o))) hit++;
    }
  }
  return n ? hit / n : 0;
}

function dedupeRing(ring) {
  const out = [];
  for (const p of ring) {
    const q = [round2(p[0]), round2(p[1])];
    const last = out.at(-1);
    if (!last || Math.hypot(q[0] - last[0], q[1] - last[1]) >= 0.05) out.push(q);
  }
  while (out.length > 1 && Math.hypot(out[0][0] - out.at(-1)[0], out[0][1] - out.at(-1)[1]) < 0.05) out.pop();
  return out;
}

function triangulated(rings) {
  const clean = rings.map(dedupeRing).filter(r => r.length >= 3);
  if (!clean.length || clean[0].length < 3) return null;
  const flat = flatten(clean);
  const triangles = earcut(flat.vertices, flat.holes, flat.dimensions);
  if (!triangles.length || deviation(flat.vertices, flat.holes, flat.dimensions, triangles) > 1e-6) return null;
  return { rings: clean, vertices: clean.flat(), triangles };
}

/** Closed OSM building outlines (ways and simple multipolygon relations) in game metres. */
export function osmBuildings(osm) {
  const out = [];
  const ringOf = geom => {
    const pts = geom.map(g => project([g.lon, g.lat]));
    const a = pts[0], b = pts.at(-1);
    return pts.length >= 4 && Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6 ? pts.slice(0, -1) : null;
  };
  for (const e of osm.elements || []) {
    if (e.type === 'way' && e.geometry) {
      const ring = ringOf(e.geometry);
      if (ring) out.push({ id: `osm:way/${e.id}`, tags: e.tags || {}, rings: [ring] });
    } else if (e.type === 'relation') {
      const members = (e.members || []).filter(m => m.geometry);
      const inners = members.filter(m => m.role === 'inner').map(m => ringOf(m.geometry)).filter(Boolean);
      members.filter(m => m.role === 'outer').forEach((m, i) => {
        const ring = ringOf(m.geometry);
        if (ring) out.push({ id: `osm:relation/${e.id}${i ? '-' + i : ''}`, tags: e.tags || {}, rings: [ring, ...inners.filter(h => pip(h[0][0], h[0][1], ring))] });
      });
    }
  }
  return out;
}

/** OSM outlines in the opening window that the 2010 footprints do not mostly cover. */
export function osmCandidates(city, osm) {
  const w = openingWindow();
  const cityPolys = [...city.buildings, ...(city.wider_buildings || [])].flatMap(b => b.polygons.map(p => p.rings));
  return osmBuildings(osm).map(o => {
    const r = o.rings[0];
    const cx = r.reduce((s, p) => s + p[0], 0) / r.length, cz = r.reduce((s, p) => s + p[1], 0) / r.length;
    return { ...o, cx, cz, area: ringsArea(o.rings) };
  }).filter(o => o.cx >= w.x0 && o.cx <= w.x1 && o.cz >= w.z0 && o.cz <= w.z1 && o.area >= 25)
    .map(o => ({ ...o, covered: coveredFraction(o.rings, cityPolys) }))
    .filter(o => o.covered * 100 < PARAMS.candidateMaxCoveredPct)
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** Roofer input: 2010 opening footprints plus OSM candidates, in Roofer's x east / y north frame. */
export function rooferFootprints(city, osm) {
  const toXY = ring => [...ring.map(([x, z]) => [x, -z]), [ring[0][0], -ring[0][1]]];
  const feats = city.buildings.map(b => ({
    type: 'Feature',
    properties: { bid: String(b.id), h_terrain: b.ground_m_navd88 },
    geometry: { type: 'MultiPolygon', coordinates: b.polygons.map(p => p.rings.map(toXY)) }
  }));
  for (const c of osmCandidates(city, osm)) {
    const nearest = city.buildings.reduce((best, b) => {
      const r = b.polygons[0].rings[0];
      const d = Math.hypot(r[0][0] - c.cx, r[0][1] - c.cz);
      return d < best.d ? { d, g: b.ground_m_navd88 } : best;
    }, { d: Infinity, g: 0 });
    feats.push({ type: 'Feature', properties: { bid: c.id, h_terrain: nearest.g }, geometry: { type: 'MultiPolygon', coordinates: [c.rings.map(toXY)] } });
  }
  return { type: 'FeatureCollection', features: feats };
}

/** Roofer CityJSONSeq -> per-id attributes and flat LoD 1.3 roof parts (game metres above Roofer ground). */
export function parseRoofer(text) {
  const lines = text.trim().split('\n').map(l => JSON.parse(l));
  const { scale, translate } = lines[0].transform;
  const byId = new Map();
  for (const f of lines.slice(1)) {
    const V = f.vertices.map(v => v.map((c, i) => c * scale[i] + translate[i]));
    for (const o of Object.values(f.CityObjects)) {
      if (o.type !== 'Building') continue;
      const a = o.attributes;
      const id = String(a.bid);
      const entry = byId.get(id) || { id, attrs: null, roofs: [] };
      if (a.rf_extrusion_mode !== 'skip' && (!entry.attrs || a.rf_success)) entry.attrs = a;
      for (const childId of o.children || []) {
        const part = f.CityObjects[childId];
        for (const g of part.geometry || []) {
          if (String(g.lod) !== '1.3') continue;
          const types = g.semantics.surfaces.map(s => s.type);
          g.boundaries[0].forEach((surface, si) => {
            if (types[g.semantics.values[0][si]] !== 'RoofSurface') return;
            const rings3 = surface.map(ring => ring.map(i => V[i]));
            const z = rings3[0].reduce((s, p) => s + p[2], 0) / rings3[0].length;
            entry.roofs.push({ z, rings: rings3.map(r => r.map(p => [p[0], -p[1]])) });
          });
        }
      }
      byId.set(id, entry);
    }
  }
  return byId;
}

function roofMasses(entry, baseH, report) {
  const a = entry.attrs;
  const g = a.rf_h_ground, p70 = a.rf_h_roof_70p - g;
  const masses = [];
  for (const r of entry.roofs) {
    const h = r.z - g;
    const area = ringsArea(r.rings);
    if (area < PARAMS.minMassAreaM2) { report.droppedTiny++; continue; }
    if (h > p70 + PARAMS.spikeAboveP70M && area < PARAMS.spikeMaxAreaM2) { report.droppedSpikes++; continue; }
    if (h - baseH < PARAMS.minRiseM) continue;
    const tri = triangulated(r.rings);
    if (!tri) { report.droppedInvalid++; continue; }
    masses.push({ h: round2(h), area_m2: round2(area), ...tri });
  }
  masses.sort((m1, m2) => m1.h - m2.h || m1.vertices[0] - m2.vertices[0] || m1.vertices[1] - m2.vertices[1]);
  return masses;
}

function lidarStats(a) {
  const g = a.rf_h_ground;
  return { ground_m: round2(g), median_m: round2(a.rf_h_roof_50p - g), p70_m: round2(a.rf_h_roof_70p - g), max_m: round2(a.rf_h_roof_max - g), points_per_m2: round2(a.rf_pt_density) };
}

export function deriveLidar2023(city, osm, rooferText) {
  const roofer = parseRoofer(rooferText);
  const report = { roofs: 0, masses: 0, droppedTiny: 0, droppedSpikes: 0, droppedInvalid: 0, noLidar: [], additions: 0, superseded: 0 };
  const roofs = {};
  for (const b of city.buildings) {
    const e = roofer.get(String(b.id));
    if (!e || !e.attrs || !e.attrs.rf_success) { report.noLidar.push(String(b.id)); continue; }
    const masses = roofMasses(e, b.height_m, report);
    roofs[b.id] = { ...lidarStats(e.attrs), city_height_m: b.height_m, masses };
    report.roofs++;
    report.masses += masses.length;
  }
  const additions = [];
  const superseded = [];
  for (const c of osmCandidates(city, osm)) {
    const e = roofer.get(c.id);
    if (!e || !e.attrs || !e.attrs.rf_success) continue;
    const stats = lidarStats(e.attrs);
    if (stats.median_m < PARAMS.minLidarBuildingM) continue;
    let reason = '';
    const inside = [];
    if (c.covered * 100 < PARAMS.additionMaxCoveredPct) {
      reason = 'not in the 2010 city footprints';
    } else {
      for (const b of city.buildings) {
        const frac = Math.max(...b.polygons.map(p => coveredFraction(p.rings, [c.rings])));
        if (frac * 100 >= PARAMS.supersededInsidePct) inside.push({ b, frac });
      }
      if (inside.some(({ b }) => roofs[b.id] && Math.abs(roofs[b.id].median_m - b.height_m) > PARAMS.replacedHeightDiffM)) {
        reason = 'replaces 2010 footprints whose 2023 LiDAR height no longer matches';
      }
    }
    if (!reason) continue;
    const poly = triangulated(c.rings);
    if (!poly) continue;
    const addition = {
      id: c.id,
      name: c.tags.name || '',
      address: [c.tags['addr:housenumber'], c.tags['addr:street']].filter(Boolean).join(' '),
      osm_building: c.tags.building || 'yes',
      osm_levels: c.tags['building:levels'] || '',
      osm_height_m: c.tags.height || '',
      reason,
      covered_by_2010_pct: Math.round(c.covered * 100),
      ...stats,
      height_m: stats.median_m,
      polygons: [poly],
      masses: roofMasses(e, stats.median_m, report)
    };
    additions.push(addition);
    for (const { b, frac } of inside) {
      superseded.push({ id: String(b.id), by: c.id, inside_pct: Math.round(frac * 100), city_height_m: b.height_m, lidar_median_m: roofs[b.id] ? roofs[b.id].median_m : null });
    }
  }
  superseded.sort((a, b) => a.id.localeCompare(b.id));
  report.additions = additions.length;
  report.superseded = superseded.length;
  return { roofs, additions, superseded, report };
}

/** 2010 footprints minus superseded ones, plus additions: the current outline set. */
export function currentFootprints(city, lidar) {
  const gone = new Set((lidar?.superseded || []).map(s => s.id));
  return [...city.buildings, ...(city.wider_buildings || [])].filter(b => !gone.has(String(b.id)))
    .concat((lidar?.additions || []).map(a => ({ id: a.id, height_m: a.height_m, polygons: a.polygons })));
}

const sha = bytes => createHash('sha256').update(bytes).digest('hex');

async function main() {
  const [mode, outPath] = process.argv.slice(2);
  const city = JSON.parse(await readFile(new URL('../godot/data/buildings.json', import.meta.url), 'utf8'));
  const osmBytes = await readFile(new URL('../' + OSM_SOURCE_PATH, import.meta.url));
  const osm = JSON.parse(osmBytes);
  if (mode === 'footprints') {
    const fc = rooferFootprints(city, osm);
    await writeFile(outPath, JSON.stringify(fc));
    console.log(`roofer footprints: ${fc.features.length} (${city.buildings.length} from 2010 + ${fc.features.length - city.buildings.length} OSM candidates) -> ${outPath}`);
    return;
  }
  const rooferBytes = await readFile(new URL('../' + ROOFER_SOURCE_PATH, import.meta.url));
  const manifestBytes = await readFile(new URL('../' + EPT_MANIFEST_PATH, import.meta.url));
  const derived = deriveLidar2023(city, osm, rooferBytes.toString('utf8'));
  const out = {
    format: 'tenderloin-redux.lidar-2023.v1',
    source: {
      lidar: {
        dataset: 'USGS 3D Elevation Program, CA_SanFrancisco_1_B23',
        collected: '2023-04-20', published: '2024-08-22',
        url: 'https://s3-us-west-2.amazonaws.com/usgs-lidar-public/CA_SanFrancisco_1_B23/ept.json',
        license: 'US Government Public Domain (AWS Open Data registry: USGS 3DEP LiDAR Point Clouds)',
        manifest: EPT_MANIFEST_PATH, manifest_sha256: sha(manifestBytes)
      },
      roofer: {
        tool: 'Roofer 1.0.0 (bb2a85a), 3DBAG / TU Delft 3D geoinformation, GPL-3.0; used offline, not bundled',
        command: ROOFER_COMMAND, lod: '1.3',
        srs_note: 'EPSG:32610 is passed only as a metric label; the points and footprints are already in the game frame (x east, y = -Z north)',
        output: ROOFER_SOURCE_PATH, output_sha256: sha(rooferBytes)
      },
      osm: {
        file: OSM_SOURCE_PATH, sha256: sha(osmBytes), query: OSM_QUERY,
        osm_base: osm.osm3s?.timestamp_osm_base || '',
        license: 'ODbL 1.0, © OpenStreetMap contributors'
      }
    },
    origin: city.origin,
    heights: 'Metres above Roofer\'s LiDAR ground estimate (5th percentile within 4 m of the footprint). City 2010 heights stay authoritative for 2010 footprints; LiDAR parts only add what rises above them.',
    params: PARAMS,
    report: { ...derived.report, noLidar: derived.report.noLidar.length },
    superseded: derived.superseded,
    additions: derived.additions,
    roofs: derived.roofs
  };
  await writeFile(new URL('../' + OUTPUT_PATH, import.meta.url), JSON.stringify(out) + '\n');
  console.log(`lidar 2023: ${out.report.roofs} roofs, ${out.report.masses} raised roof parts, ${out.report.additions} additions, ${out.report.superseded} superseded 2010 footprints (dropped: ${out.report.droppedTiny} tiny, ${out.report.droppedSpikes} spikes, ${out.report.droppedInvalid} invalid; ${out.report.noLidar} without LiDAR)`);
  for (const a of out.additions) console.log(`  + ${a.id} ${a.name} ${a.address}: ${a.height_m} m (${a.reason})`);
  for (const s of out.superseded) console.log(`  - ${s.id} (2010 ${s.city_height_m} m, LiDAR ${s.lidar_median_m} m) inside ${s.by} ${s.inside_pct}%`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => { console.error(err.stack || err.message); process.exitCode = 1; });
}
