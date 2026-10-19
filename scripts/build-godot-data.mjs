// Offline, reproducible build of the city's dated building massing; no network at runtime.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import earcut, { flatten, deviation } from './vendor/earcut.js';

export const origin = { lat: 37.7832203, lon: -122.410784 };
export const bbox = [-122.4118, 37.7825, -122.4085, 37.7842];
// Local tangent approximation, actual metres. X east; Z south. No block compression.
export function project([lon, lat]) {
  return [(lon - origin.lon) * 111320 * Math.cos(origin.lat * Math.PI / 180) || 0,
    -(lat - origin.lat) * 111320 || 0];
}
export function derive(source) {
  const ids = new Set();
  const buildings = source.features.map(feature => {
    const p = feature.properties, id = p.sf16_bldgid;
    if (!id || ids.has(id)) throw Error('Missing or duplicate building ID');
    ids.add(id);
    if (feature.geometry.type !== 'MultiPolygon') throw Error(`${id}: unsupported geometry`);
    const height = Number(p.hgt_mediancm) / 100;
    const ground = Number(p.gnd_mediancm) / 100;
    if (!Number.isFinite(ground)) throw Error(`${id}: invalid ground elevation`);
    if (!Number.isFinite(height) || height <= 0 || height > 300) throw Error(`${id}: invalid measured height`);
    if (Math.abs(height - Number(p.hgt_median_m)) > 0.011) throw Error(`${id}: height unit mismatch`);
    const polygons = feature.geometry.coordinates.map(polygon => {
      const rings = polygon.map(ring => {
        if (ring.length < 4 || JSON.stringify(ring[0]) !== JSON.stringify(ring.at(-1))) throw Error(`${id}: open ring`);
        return ring.slice(0, -1).map(coord => {
          if (coord.length < 2 || !coord.slice(0, 2).every(Number.isFinite)) throw Error(`${id}: invalid coordinate`);
          return project(coord);
        });
      });
      const flat = flatten(rings);
      const triangles = earcut(flat.vertices, flat.holes, flat.dimensions);
      if (!triangles.length || deviation(flat.vertices, flat.holes, flat.dimensions, triangles) > 1e-8) {
        throw Error(`${id}: roof triangulation area mismatch`);
      }
      return { rings, vertices: rings.flat(), triangles };
    });
    return { id, height_m: height, ground_m_navd88: ground,
      data_as_of: p.data_as_of, polygons };
  });
  return { format: 1, origin, bbox, coordinate_system: 'Local approximate metres; X east, Z south; flat presentation ground',
    source: 'San Francisco Building Footprints ynuv-fyni; PDDL; Pictometry 2010; method 2017-05-01',
    height: 'hgt_mediancm / 100; median above-ground height, not roof elevation or a detailed roof', buildings };
}
export async function build() {
  const raw = await readFile(new URL('../godot/data/source/buildings.geojson', import.meta.url));
  const result = derive(JSON.parse(raw));
  result.source_sha256 = createHash('sha256').update(raw).digest('hex');
  const streetBytes = await readFile(new URL('../public/data/streets.osm.json', import.meta.url));
  const streets = JSON.parse(streetBytes);
  result.streets = deriveStreets(streets);
  result.streets_sha256 = createHash('sha256').update(streetBytes).digest('hex');
  result.street_source = streets.source;
  await writeFile(new URL('../godot/data/buildings.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
  console.log(`Derived ${result.buildings.length} measured footprints; courtyards retained. ${result.source_sha256}`);
  return result;
}
export function deriveStreets(streets) {
  return streets.ways.filter(way => ['Turk Street', 'Taylor Street', 'Mason Street'].includes(way.name))
    .map(way => ({ id: way.id, name: way.name, points: way.geometry.map(({ lon, lat }) => project([lon, lat])) }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await build();
