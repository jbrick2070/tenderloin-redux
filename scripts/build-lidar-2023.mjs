// Offline, reproducible derivation of 2023 LiDAR roofs and current buildings; no network at runtime.
//
// Inputs, all retained in godot/data/source/:
//   - roofer_lod13.city.jsonl: Roofer 1.0.0 LoD 1.3 reconstruction (CityJSONSeq, pass 1) from the
//     2023 USGS 3DEP San Francisco LiDAR (CA_SanFrancisco_1_B23, public domain): all 188 footprints
//     plus OSM outlines the 2010 layer does not mostly cover. The point download is listed
//     node-by-node with hashes in lidar_ept_manifest.json.
//   - roofer_lod13_pass2.city.jsonl: pass 2, the same command limited (--filter) to the 2010
//     footprints pass 1 skipped (Roofer flags a few as having insufficient points in the full-area
//     run although an isolated run reconstructs them) and to the OSM outlines of rebuilt sites.
//   - osm_buildings.json: raw Overpass response with current OpenStreetMap building outlines over
//     the modeled Tenderloin area (ODbL 1.0, © OpenStreetMap contributors).
//   - ../buildings.json: the 2010 city footprints (DataSF ynuv-fyni, PDDL 1.0).
//
// Steps (see godot/data/SOURCES.md for the exact commands):
//   1. py -3 -I scripts/lidar/fetch_ept.py <dir> ...       download the LiDAR octree nodes
//   2. python -I scripts/lidar/crop_points.py <dir> ...     crop + reproject into the game frame
//   3. node scripts/build-lidar-2023.mjs footprints <f>     Roofer pass-1 footprints
//   4. roofer ... --lod13 ...                               reconstruct (not bundled; GPL-3.0)
//   5. node scripts/build-lidar-2023.mjs pass2 <f>          Roofer pass-2 footprints and its --filter
//   6. roofer ... --filter "..." ...                        reconstruct pass 2
//   7. node scripts/build-lidar-2023.mjs                    write godot/data/lidar_2023.json
//
// Heights are metres above the city's surveyed median ground (ground_m_navd88) for 2010 footprints
// and above the nearby 2010 ground for additions. Roofer's own ground (5th percentile within 4 m)
// sits several metres low on sloped blocks, so it is kept only for comparison.
//
// The game keeps every 2010 footprint at its measured median height. This file adds:
//   roofs:      per 2010 footprint, the LiDAR roof parts that rise above that median
//               (penthouses, upper wings, towers), triangulated for the RooftopDetails mesh;
//   additions:  current OSM outlines the 2023 LiDAR confirms but the 2010 layer lacks: buildings
//               the 2010 footprints barely cover ("missing"), and buildings that contain most of a
//               2010 footprint whose LiDAR height no longer matches ("rebuilt");
//   superseded: 2010 footprints that lie mostly inside an addition. The game hides them and leaves
//               them out of collision, but keeps their ids and records.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import earcut, { flatten, deviation } from './vendor/earcut.js';
import { project, widerBbox } from './build-godot-data.mjs';

export const OSM_SOURCE_PATH = 'godot/data/source/osm_buildings.json';
export const ROOFER_SOURCE_PATH = 'godot/data/source/roofer_lod13.city.jsonl';
export const ROOFER_PASS2_PATH = 'godot/data/source/roofer_lod13_pass2.city.jsonl';
export const EPT_MANIFEST_PATH = 'godot/data/source/lidar_ept_manifest.json';
export const OUTPUT_PATH = 'godot/data/lidar_2023.json';
export const OSM_QUERY = '[out:json][timeout:90];(way["building"](37.7813,-122.4172,37.7848,-122.4078);relation["building"](37.7813,-122.4172,37.7848,-122.4078););out geom;';
export const ROOFER_COMMAND = 'roofer -j 16 --bld-class 1 --grnd-class 2 --id-attribute bid --h-terrain-attribute h_terrain --h-terrain-strategy buffer_user --no-lod22 --lod13 --cj-translate 0 0 0 --srs EPSG:32610 points.laz footprints.geojson out';
export const PARAMS = {
  minMassAreaM2: 4,           // smaller roof parts are dropped (noise, chimneys)
  minRiseM: 1.0,              // a roof part must rise this far above the 2010 median to be drawn
  spikeAboveP70M: 12,         // small parts this far above the building's 70th-percentile roof...
  spikeMaxAreaM2: 25,         // ...and smaller than this are neighbor walls, cranes, or trees, not roofs
  minReliableAreaM2: 20,      // footprints smaller than this are too small for a LiDAR height check
  candidateMaxCoveredPct: 85, // pass 1 also measures OSM outlines covered less than this by 2010
  additionMaxCoveredPct: 40,  // below this the OSM building is simply missing from 2010
  changedHeightDiffM: 5,      // LiDAR vs 2010 median difference that marks a changed building
  supersededInsidePct: 70,    // a 2010 footprint this much inside an addition is superseded
  minLidarBuildingM: 3,       // an addition needs a LiDAR median roof at least this high
  groundRadiusM: 40           // additions take the median 2010 ground of footprints this close
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
const centroid = ring => [ring.reduce((s, p) => s + p[0], 0) / ring.length, ring.reduce((s, p) => s + p[1], 0) / ring.length];
const median = values => { const s = [...values].sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : NaN; };
const cityFootprints = city => [...city.buildings, ...(city.wider_buildings || [])];
const footprintArea = b => b.polygons.reduce((s, p) => s + ringsArea(p.rings), 0);

/** The city's wider footprint query window (it contains the opening-block window), in game metres. */
export function queryWindow() {
  const [x0, z1] = project([widerBbox[0], widerBbox[1]]);
  const [x1, z0] = project([widerBbox[2], widerBbox[3]]);
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
const insideFraction = (b, rings) => Math.max(...b.polygons.map(p => coveredFraction(p.rings, [rings])));

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

const osmCache = new WeakMap();
/** Every OSM outline of at least 25 m2 with its centroid, area, and 2010 coverage (memoized). */
export function osmAll(city, osm) {
  if (osmCache.has(osm)) return osmCache.get(osm);
  const cityPolys = cityFootprints(city).flatMap(b => b.polygons.map(p => p.rings));
  const all = osmBuildings(osm).map(o => {
    const [cx, cz] = centroid(o.rings[0]);
    return { ...o, cx, cz, area: ringsArea(o.rings) };
  }).filter(o => o.area >= 25).map(o => ({ ...o, covered: coveredFraction(o.rings, cityPolys) }))
    .sort((a, b) => a.id.localeCompare(b.id));
  osmCache.set(osm, all);
  return all;
}

/** OSM outlines whose centroid lies in the city's query window. Only these can be "missing" from
 *  2010: outside it the 2010 extract has no footprints to compare with. */
export function osmInWindow(city, osm) {
  const w = queryWindow();
  return osmAll(city, osm).filter(o => o.cx >= w.x0 && o.cx <= w.x1 && o.cz >= w.z0 && o.cz <= w.z1);
}

/** Pass-1 OSM candidates: outlines the 2010 footprints do not mostly cover. */
export function osmCandidates(city, osm) {
  return osmInWindow(city, osm).filter(o => o.covered * 100 < PARAMS.candidateMaxCoveredPct);
}

const toXY = ring => [...ring.map(([x, z]) => [x, -z]), [ring[0][0], -ring[0][1]]];
function nearestGround(city, cx, cz) {
  let best = { d: Infinity, g: 0 };
  for (const b of cityFootprints(city)) {
    const [bx, bz] = centroid(b.polygons[0].rings[0]);
    const d = Math.hypot(bx - cx, bz - cz);
    if (d < best.d) best = { d, g: b.ground_m_navd88 };
  }
  return best.g;
}
const osmFeature = (city, o) => ({ type: 'Feature', properties: { bid: o.id, h_terrain: nearestGround(city, o.cx, o.cz) }, geometry: { type: 'MultiPolygon', coordinates: [o.rings.map(toXY)] } });

/** Roofer pass-1 input: all 2010 footprints plus OSM candidates, in Roofer's x east / y north frame. */
export function rooferFootprints(city, osm) {
  const feats = cityFootprints(city).map(b => ({
    type: 'Feature',
    properties: { bid: String(b.id), h_terrain: b.ground_m_navd88 },
    geometry: { type: 'MultiPolygon', coordinates: b.polygons.map(p => p.rings.map(toXY)) }
  }));
  for (const c of osmCandidates(city, osm)) feats.push(osmFeature(city, c));
  return { type: 'FeatureCollection', features: feats };
}

/** Roofer CityJSONSeq -> per-id attributes and flat LoD 1.3 roof parts (absolute z, game x/z). */
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

/** Ids pass 1 skipped (Roofer found no usable points), which pass 2 retries. */
export function rooferSkipped(rooferText) {
  return [...parseRoofer(rooferText).values()].filter(e => !e.attrs).map(e => e.id).sort();
}

function lidarStats(a, ground) {
  return {
    ground_m: round2(ground), lidar_ground_m: round2(a.rf_h_ground),
    median_m: round2(a.rf_h_roof_50p - ground), p70_m: round2(a.rf_h_roof_70p - ground), max_m: round2(a.rf_h_roof_max - ground),
    points_per_m2: round2(a.rf_pt_density)
  };
}

function roofMasses(entry, ground, baseH, report) {
  const p70 = entry.attrs.rf_h_roof_70p - ground;
  const masses = [];
  for (const r of entry.roofs) {
    const h = r.z - ground;
    const area = ringsArea(r.rings);
    if (area < PARAMS.minMassAreaM2) { report.droppedTiny++; continue; }
    if (h > p70 + PARAMS.spikeAboveP70M && area < PARAMS.spikeMaxAreaM2) { report.droppedSpikes++; continue; }
    if (h - baseH < PARAMS.minRiseM) continue;
    const tri = triangulated(r.rings);
    if (!tri) { report.droppedInvalid++; continue; }
    masses.push({ h: round2(h), area_m2: round2(area), ...tri });
  }
  masses.sort((m1, m2) => m1.h - m2.h || m1.vertices[0][0] - m2.vertices[0][0] || m1.vertices[0][1] - m2.vertices[0][1]);
  return masses;
}

/** Pass-1 roof records for the 2010 footprints (median heights above the city's ground). */
function cityRoofStats(city, roofer) {
  const out = new Map();
  for (const b of cityFootprints(city)) {
    const e = roofer.get(String(b.id));
    if (!e || !e.attrs || !e.attrs.rf_success) continue;
    out.set(String(b.id), { b, e, stats: lidarStats(e.attrs, b.ground_m_navd88), area: footprintArea(b) });
  }
  return out;
}
const isChanged = r => r.area >= PARAMS.minReliableAreaM2 && Math.abs(r.stats.median_m - r.b.height_m) > PARAMS.changedHeightDiffM;

/** OSM outlines (beyond the pass-1 candidates) that contain most of a changed 2010 footprint. */
export function rebuiltOutlines(city, osm, pass1Text) {
  const stats = cityRoofStats(city, parseRoofer(pass1Text));
  const changed = [...stats.values()].filter(isChanged);
  const candidateIds = new Set(osmCandidates(city, osm).map(c => c.id));
  // Any OSM outline may hold a changed 2010 footprint, even one whose centroid is outside the window.
  return osmAll(city, osm).filter(o => !candidateIds.has(o.id) && changed.some(r => insideFraction(r.b, o.rings) * 100 >= PARAMS.supersededInsidePct));
}

/** Roofer pass-2 input: pass-1 skips plus rebuilt-site OSM outlines, and the matching --filter. */
export function rooferPass2Footprints(city, osm, pass1Text) {
  const pass1 = rooferFootprints(city, osm);
  const skipped = new Set(rooferSkipped(pass1Text));
  const feats = pass1.features.filter(f => skipped.has(f.properties.bid));
  for (const o of rebuiltOutlines(city, osm, pass1Text)) feats.push(osmFeature(city, o));
  const ids = feats.map(f => f.properties.bid);
  return { fc: { type: 'FeatureCollection', features: feats }, ids, filter: `bid IN (${ids.map(id => `'${id}'`).join(',')})` };
}

export function deriveLidar2023(city, osm, pass1Text, pass2Text = '') {
  const roofer = parseRoofer(pass1Text);
  if (pass2Text) {
    for (const [id, e] of parseRoofer(pass2Text)) {
      const main = roofer.get(id);
      if (!main || (!main.attrs && e.attrs)) roofer.set(id, { ...e, pass2: true });
    }
  }
  const report = { roofs: 0, masses: 0, changed: [], tooSmall: 0, droppedTiny: 0, droppedSpikes: 0, droppedInvalid: 0, noLidar: [], additions: 0, superseded: 0 };
  const stats = cityRoofStats(city, roofer);
  const roofs = {};
  for (const b of cityFootprints(city)) {
    const r = stats.get(String(b.id));
    if (!r) { report.noLidar.push(String(b.id)); continue; }
    const masses = roofMasses(r.e, b.ground_m_navd88, b.height_m, report);
    const tooSmall = r.area < PARAMS.minReliableAreaM2;
    roofs[b.id] = { ...r.stats, city_height_m: b.height_m, ...(r.e.pass2 ? { roofer_pass2: true } : {}), ...(tooSmall ? { too_small: true } : {}), masses };
    if (tooSmall) report.tooSmall++;
    if (isChanged(r)) report.changed.push(String(b.id));
    report.roofs++;
    report.masses += masses.length;
  }
  const changedSet = new Set(report.changed);
  const candidates = [...osmCandidates(city, osm), ...rebuiltOutlines(city, osm, pass1Text)];
  const additions = [];
  const superseded = [];
  for (const c of candidates.sort((a, b) => a.id.localeCompare(b.id))) {
    const e = roofer.get(c.id);
    if (!e || !e.attrs || !e.attrs.rf_success) continue;
    const inside = [];
    for (const b of cityFootprints(city)) {
      const frac = insideFraction(b, c.rings);
      if (frac * 100 >= PARAMS.supersededInsidePct) inside.push({ b, frac });
    }
    let reason = '';
    if (c.covered * 100 < PARAMS.additionMaxCoveredPct) reason = 'missing';
    else if (inside.some(({ b }) => changedSet.has(String(b.id)))) reason = 'rebuilt';
    if (!reason) continue;
    const near = inside.length ? inside.map(({ b }) => b.ground_m_navd88)
      : cityFootprints(city).filter(b => { const [bx, bz] = centroid(b.polygons[0].rings[0]); return Math.hypot(bx - c.cx, bz - c.cz) <= PARAMS.groundRadiusM; }).map(b => b.ground_m_navd88);
    const ground = near.length ? median(near) : nearestGround(city, c.cx, c.cz);
    const s = lidarStats(e.attrs, ground);
    if (s.median_m < PARAMS.minLidarBuildingM) continue;
    const poly = triangulated(c.rings);
    if (!poly) continue;
    additions.push({
      id: c.id,
      name: c.tags.name || '',
      address: [c.tags['addr:housenumber'], c.tags['addr:street']].filter(Boolean).join(' '),
      osm_building: c.tags.building || 'yes',
      osm_levels: c.tags['building:levels'] || '',
      osm_height_m: c.tags.height || '',
      reason: reason === 'missing' ? 'not in the 2010 city footprints' : 'replaces 2010 footprints whose 2023 LiDAR height no longer matches',
      covered_by_2010_pct: Math.round(c.covered * 100),
      ...(e.pass2 ? { roofer_pass2: true } : {}),
      ...s,
      height_m: s.median_m,
      polygons: [poly],
      masses: roofMasses(e, ground, s.median_m, report)
    });
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
  return cityFootprints(city).filter(b => !gone.has(String(b.id)))
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
    const n2010 = cityFootprints(city).length;
    console.log(`roofer pass-1 footprints: ${fc.features.length} (${n2010} from 2010 + ${fc.features.length - n2010} OSM candidates) -> ${outPath}`);
    return;
  }
  const rooferBytes = await readFile(new URL('../' + ROOFER_SOURCE_PATH, import.meta.url));
  if (mode === 'pass2') {
    const p2 = rooferPass2Footprints(city, osm, rooferBytes.toString('utf8'));
    await writeFile(outPath, JSON.stringify(p2.fc));
    console.log(`roofer pass-2 footprints: ${p2.ids.length} -> ${outPath}\n--filter "${p2.filter}"`);
    return;
  }
  const pass2Bytes = await readFile(new URL('../' + ROOFER_PASS2_PATH, import.meta.url));
  const manifestBytes = await readFile(new URL('../' + EPT_MANIFEST_PATH, import.meta.url));
  const derived = deriveLidar2023(city, osm, rooferBytes.toString('utf8'), pass2Bytes.toString('utf8'));
  const p2 = rooferPass2Footprints(city, osm, rooferBytes.toString('utf8'));
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
        output: ROOFER_SOURCE_PATH, output_sha256: sha(rooferBytes),
        pass2_command: ROOFER_COMMAND.replace(' points.laz', ` --filter "${p2.filter}" points.laz`).replace(' footprints.geojson', ' footprints_pass2.geojson').replace(/ out$/, ' out-pass2'),
        pass2_ids: p2.ids, pass2_output: ROOFER_PASS2_PATH, pass2_output_sha256: sha(pass2Bytes)
      },
      osm: {
        file: OSM_SOURCE_PATH, sha256: sha(osmBytes), query: OSM_QUERY,
        osm_base: osm.osm3s?.timestamp_osm_base || '',
        license: 'ODbL 1.0, © OpenStreetMap contributors'
      }
    },
    origin: city.origin,
    heights: 'Metres above the city\'s surveyed median ground (2010 footprints) or the median 2010 ground nearby (additions). City 2010 heights stay authoritative for 2010 footprints; LiDAR parts only add what rises above them.',
    params: PARAMS,
    report: { ...derived.report, noLidar: derived.report.noLidar.length },
    superseded: derived.superseded,
    additions: derived.additions,
    roofs: derived.roofs
  };
  await writeFile(new URL('../' + OUTPUT_PATH, import.meta.url), JSON.stringify(out) + '\n');
  const r = out.report;
  console.log(`lidar 2023: ${r.roofs} roofs, ${r.masses} raised roof parts, ${r.changed.length} changed since 2010, ${r.additions} additions, ${r.superseded} superseded 2010 footprints (dropped: ${r.droppedTiny} tiny, ${r.droppedSpikes} spikes, ${r.droppedInvalid} invalid; ${r.tooSmall} too small to check; ${r.noLidar} without LiDAR)`);
  for (const a of out.additions) console.log(`  + ${a.id} ${a.name} ${a.address}: ${a.height_m} m (${a.reason})`);
  for (const s of out.superseded) console.log(`  - ${s.id} (2010 ${s.city_height_m} m, LiDAR ${s.lidar_median_m} m) inside ${s.by} ${s.inside_pct}%`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => { console.error(err.stack || err.message); process.exitCode = 1; });
}
