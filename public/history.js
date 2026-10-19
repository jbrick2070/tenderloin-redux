import { project } from './core.js';

// Shared Turk nodes from the retained 2026-10-18 OSM extract. Intersection areas,
// not surveyed entrances, current plaques or culturally designated boundaries.
export const WEST_INTERSECTIONS = [
  { name: 'Jones Street', node: '65365830', ...project({ lat: 37.7830115, lon: -122.4124265 }) },
  { name: 'Leavenworth Street', node: '65362154', ...project({ lat: 37.7828026, lon: -122.4140702 }) },
  { name: 'Hyde Street', node: '65360270', ...project({ lat: 37.7825934, lon: -122.4157156 }) },
];
const hyde = WEST_INTERSECTIONS[2];
export const BLACK_HAWK = { id: 'blackhawk', name: 'Black Hawk history stop', x: hyde.x, y: hyde.y - 48, icon: '♪' };

// Original schematic blocks between the actual intersections. Keep a margin
// beyond the authored road edge; the last piece joins the older opening art.
export const WEST_FACADES = [...WEST_INTERSECTIONS].reverse().map((cross, i, streets) => {
  const left = cross.x + 86, right = Math.min((streets[i + 1]?.x ?? 0) - 86, -309);
  return { x: left, width: right - left };
});
