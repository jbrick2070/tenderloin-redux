// One separately attributed exterior; never widens/relabels the city/LiDAR survey.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import earcut from './vendor/earcut.js';
import { project } from './build-godot-data.mjs';

export function derivePowerPlace(osm, streets, addresses, intersections) {
  const way = osm.elements.find(w => w.type === 'way' && w.id === 71209428);
  const street = streets.ways.find(w => w.id === 30832489);
  const returnStreet = streets.ways.find(w => w.id === 277480424);
  const address = addresses.find(a => a.eas_address_id === '491045');
  const junction = intersections.find(i => i.cnntext === '25148000');
  if (!way || !street || !returnStreet || !address || !junction) throw Error('Missing explicit Larkin source identity');
  const returnPoint = returnStreet.geometry.at(-1);
  const ring = way.geometry.slice(0, -1).map(p => project([p.lon, p.lat]));
  const lonlat = junction.the_geom.coordinates;
  return {
    format: 1,
    id: 'larkin-2017', name: 'Larkin Substation', address: '600 Larkin Street at Eddy', date: '2017-04-21',
    source_precision: 'City address point and street intersection; neither is an entrance or failed equipment position.',
    junction: { lonlat, xz: project(lonlat), source: 'SF Street Intersections gmfx-8h6i, CNN 25148000, PDDL' },
    return_junction: { lonlat: [returnPoint.lon,returnPoint.lat], xz: project([returnPoint.lon,returnPoint.lat]), source: 'Existing OSM Eddy way 277480424 endpoint at Taylor; use Eddy approach in both directions' },
    address_point: { lonlat: [Number(address.longitude), Number(address.latitude)], xz: project([Number(address.longitude), Number(address.latitude)]), source: 'SF Enterprise Addressing System 3mea-di5p, EAS 491045, PDDL' },
    exterior: { id: 'osm:way/71209428', name: 'Larkin Substation', height_m: Number(way.tags.height), height_source: 'OSM contributor height tag; not LiDAR measured', polygons: [{ rings: [ring], vertices: ring, triangles: earcut(ring.flat()) }], source: 'OpenStreetMap contributors, ODbL; retained 2026-10-20 extract' },
    eddy: { id: street.id, points: street.geometry.map(p => project([p.lon, p.lat])) },
    history: {
      cause: 'Circuit-breaker cabinet arc and fire', start: 'about 9:06 a.m.', restored: '4:46 p.m.', affected: 'about 88,000 customers',
      report: 'Exponent, Larkin Outage Investigation, September 15, 2017; commissioned by PG&E; CPUC-hosted. Printed pages 1, 9 and 34.',
      url: 'https://www.cpuc.ca.gov/-/media/cpuc-website/files/uploadedfiles/cpuc_public_website/content/safety/electric_safety_and_reliability/attachment-3-exponent-report-larkin-outage-redacted-version.pdf',
      utility_url: 'https://investor.pgecorp.com/news-events/press-releases/press-release-details/2017/PGE-Safely-Restores-Power-to-San-Francisco-Thanks-Customers-for-their-Patience-Substation-Scheduled-for-Modernization/default.aspx',
      fiction: 'Original imagined community battery-light tasks. PG&E restored utility service. No real equipment layout, entrance, repair procedure, present fault or current facade is depicted.'
    }
  };
}
export async function buildPowerPlace() {
  const paths = ['godot/data/source/osm_buildings.json','public/data/streets.osm.json','godot/data/source/larkin/address.json','godot/data/source/larkin/intersection.json'];
  const bytes = await Promise.all(paths.map(p => readFile(p)));
  const result = derivePowerPlace(...bytes.map(b => JSON.parse(b)));
  result.source_sha256 = Object.fromEntries(paths.map((p,i) => [p,createHash('sha256').update(bytes[i]).digest('hex')]));
  await writeFile('godot/data/power_place.json', JSON.stringify(result,null,2)+'\n');
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await buildPowerPlace();
