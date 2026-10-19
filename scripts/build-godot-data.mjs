// Offline, reproducible build of the city's dated building massing; no network at runtime.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import earcut, { flatten, deviation } from './vendor/earcut.js';

export const origin = { lat: 37.7832203, lon: -122.410784 };
export const bbox = [-122.4118, 37.7825, -122.4085, 37.7842];
export const widerBbox = [-122.4165, 37.7820, -122.4085, 37.7842];
export const WIDER_STREET_NAMES = [
  'Turk Street',
  'Taylor Street',
  'Mason Street',
  'Jones Street',
  'Leavenworth Street',
  'Hyde Street',
  'Eddy Street'
];
export const WEST_INTERSECTIONS = [
  { id: 'jones', name: 'Jones Street', node: '65365830', lat: 37.7830115, lon: -122.4124265 },
  { id: 'leavenworth', name: 'Leavenworth Street', node: '65362154', lat: 37.7828026, lon: -122.4140702 },
  { id: 'hyde', name: 'Hyde Street', node: '65360270', lat: 37.7825934, lon: -122.4157156 }
];
export const HISTORY_STOPS = [
  {
    id: 'comptons',
    name: "Compton's Corner (Turk & Taylor)",
    title: "Compton's Corner (Turk & Taylor)",
    year: 1966,
    intersection: 'Turk & Taylor',
    pos: [-6.0, -5.5],
    note: "Gene Compton's Cafeteria stood at 101–121 Taylor Street at Turk, where trans women and Tenderloin neighbors resisted police harassment in August 1966 — anchoring the Transgender Cultural District (founded 2017) within the wider Tenderloin.",
    source_note: "SF Historic Preservation Commission agenda (2026-03-18): 101–121 Taylor, northwest corner of Turk and Taylor, associated with the 1966 Compton's Cafeteria uprising in the Transgender Cultural District."
  },
  {
    id: 'blackhawk',
    name: 'Former Black Hawk Jazz Club (Turk & Hyde)',
    title: 'Former Black Hawk Jazz Club (Turk & Hyde)',
    year: 1949,
    intersection: 'Turk & Hyde',
    pos: [-424.5, 62.5],
    note: 'At 200 Hyde Street at Turk — four blocks west of Mason — the Black Hawk jazz club hosted Miles Davis (April 1961 Friday Night at the Blackhawk), Thelonious Monk, Dave Brubeck, Billie Holiday, and Vince Guaraldi from 1949 to 1963.',
    source_note: 'SFJAZZ & Miles Davis official catalog (April 1961 Friday Night at the Blackhawk); Tenderloin Museum identifies 200 Hyde at Turk (closed 1963) and 2022 Blackhawk Block Party archive.'
  }
];

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

export function deriveWiderBuildings(widerSource, openingBuildings) {
  if (!widerSource || !Array.isArray(widerSource.features)) throw Error('Invalid wider building source');
  const openingIds = new Set(openingBuildings.map(b => b.id));
  const widerAllIds = new Set(widerSource.features.map(f => f?.properties?.sf16_bldgid));
  for (const id of openingIds) {
    if (!widerAllIds.has(id)) throw Error(`Wider extract missing opening-block building ${id}`);
  }
  const extraFeatures = widerSource.features.filter(f => !openingIds.has(f?.properties?.sf16_bldgid));
  return derive({ type: 'FeatureCollection', features: extraFeatures }).buildings;
}

export function deriveStreets(streets) {
  return streets.ways.filter(way => ['Turk Street', 'Taylor Street', 'Mason Street'].includes(way.name))
    .map(way => ({ id: way.id, name: way.name, points: way.geometry.map(({ lon, lat }) => project([lon, lat])) }));
}

export function deriveWiderStreets(streets) {
  return streets.ways.filter(way => WIDER_STREET_NAMES.includes(way.name))
    .map(way => ({ id: way.id, name: way.name, points: way.geometry.map(({ lon, lat }) => project([lon, lat])) }));
}

export function deriveCulturalDistrict(districtGeojson, districtMeta = {}) {
  if (districtGeojson?.type !== 'FeatureCollection' || districtGeojson.features?.length !== 1) {
    throw Error('Expected one cultural district feature');
  }
  const feature = districtGeojson.features[0];
  if (feature.type !== 'Feature' || feature.properties?.district_name !== 'Transgender Cultural District' || feature.geometry?.type !== 'MultiPolygon') {
    throw Error('Unexpected cultural district feature');
  }
  const rawPolygons = feature.geometry.coordinates;
  if (!Array.isArray(rawPolygons) || !rawPolygons.length || rawPolygons.length > 10) {
    throw Error('Invalid cultural district polygons');
  }
  let totalVertices = 0;
  const polygons = rawPolygons.map(polygon => {
    if (!Array.isArray(polygon) || !polygon.length || polygon.length > 10) {
      throw Error('Invalid cultural district rings');
    }
    const rings = polygon.map(ring => {
      if (!Array.isArray(ring) || ring.length < 4 || (totalVertices += ring.length) > 1000) {
        throw Error('Invalid cultural district ring');
      }
      if (ring[0][0] !== ring.at(-1)[0] || ring[0][1] !== ring.at(-1)[1]) {
        throw Error('Open cultural district ring');
      }
      return ring.slice(0, -1).map(coord => {
        if (!Array.isArray(coord) || coord.length !== 2 || !coord.every(Number.isFinite)) {
          throw Error('Invalid cultural district coordinate');
        }
        const [lon, lat] = coord;
        if (lon < -122.55 || lon > -122.3 || lat < 37.7 || lat > 37.85) {
          throw Error('Cultural district coordinate outside local region');
        }
        return project([lon, lat]);
      });
    });
    return { rings };
  });
  return {
    name: 'Transgender Cultural District',
    dataset_id: districtMeta.datasetId || '5xmc-5bjj',
    publisher: districtMeta.publisher || 'San Francisco Planning Department',
    license: districtMeta.licenseId || 'PDDL',
    designation_year: 2017,
    designation_date_raw: feature.properties.designation_date,
    designation_date_note: districtMeta.designationDateNote || 'Dataset date uses January 1 within 2017; organization describes founding year 2017.',
    scope: districtMeta.scope || 'City-published Cultural Districts boundary layer within the wider Tenderloin neighborhood.',
    polygons
  };
}

export function deriveWestIntersections() {
  return WEST_INTERSECTIONS.map(item => ({
    id: item.id,
    name: item.name,
    node: item.node,
    point: project([item.lon, item.lat])
  }));
}

export async function build() {
  const raw = await readFile(new URL('../godot/data/source/buildings.geojson', import.meta.url));
  const result = derive(JSON.parse(raw));
  result.source_sha256 = createHash('sha256').update(raw).digest('hex');

  const widerRaw = await readFile(new URL('../godot/data/source/buildings_tenderloin_west.geojson', import.meta.url));
  result.wider_bbox = widerBbox;
  result.wider_buildings = deriveWiderBuildings(JSON.parse(widerRaw), result.buildings);
  result.wider_source_sha256 = createHash('sha256').update(widerRaw).digest('hex');

  const streetBytes = await readFile(new URL('../public/data/streets.osm.json', import.meta.url));
  const streets = JSON.parse(streetBytes);
  result.streets = deriveStreets(streets);
  result.wider_streets = deriveWiderStreets(streets);
  result.streets_sha256 = createHash('sha256').update(streetBytes).digest('hex');
  result.street_source = streets.source;

  const districtBytes = await readFile(new URL('../public/data/transgender-district.geojson', import.meta.url));
  const districtMetaBytes = await readFile(new URL('../public/data/cultural-district-source.json', import.meta.url));
  result.cultural_district = deriveCulturalDistrict(JSON.parse(districtBytes), JSON.parse(districtMetaBytes));
  result.cultural_district_sha256 = createHash('sha256').update(districtBytes).digest('hex');
  result.cultural_district_meta_sha256 = createHash('sha256').update(districtMetaBytes).digest('hex');

  result.west_intersections = deriveWestIntersections();
  result.history_stops = HISTORY_STOPS;

  await writeFile(new URL('../godot/data/buildings.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
  console.log(`Derived ${result.buildings.length} opening footprints + ${result.wider_buildings.length} wider Tenderloin footprints (${result.buildings.length + result.wider_buildings.length} total); courtyards and cultural district retained. ${result.source_sha256}`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await build();
