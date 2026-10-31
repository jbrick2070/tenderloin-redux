import { project } from './core.js';

// Validate the bundled city feature before drawing. No geometry is inferred from
// street centerlines, and no community identity is inferred from this boundary.
export function districtGeometry(data) {
  if (data?.type !== 'FeatureCollection' || data.features?.length !== 1) throw Error('Expected one district feature');
  const feature = data.features[0];
  if (feature.type !== 'Feature' || feature.properties?.district_name !== 'Transgender Cultural District' || feature.geometry?.type !== 'MultiPolygon') throw Error('Unexpected district');
  const polygons = feature.geometry.coordinates;
  if (!Array.isArray(polygons) || !polygons.length || polygons.length > 10) throw Error('Invalid polygons');
  let total = 0;
  return polygons.map(polygon => {
    if (!Array.isArray(polygon) || !polygon.length || polygon.length > 10) throw Error('Invalid rings');
    return polygon.map(ring => {
      if (!Array.isArray(ring) || ring.length < 4 || (total += ring.length) > 1000) throw Error('Invalid ring');
      const points = ring.map(position => {
        if (!Array.isArray(position) || position.length !== 2 || !position.every(Number.isFinite)) throw Error('Invalid coordinate');
        const [lon, lat] = position;
        if (lon < -122.55 || lon > -122.3 || lat < 37.7 || lat > 37.85) throw Error('Coordinate outside local region');
        return project({ lat, lon });
      });
      if (ring[0][0] !== ring.at(-1)[0] || ring[0][1] !== ring.at(-1)[1]) throw Error('Open ring');
      return points;
    });
  });
}

export function drawDistrict(ctx, polygons, scale, bounds) {
  ctx.save();
  ctx.beginPath(); ctx.rect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top); ctx.clip();
  ctx.fillStyle = '#bd739413'; ctx.strokeStyle = '#724e70';
  ctx.lineWidth = 2 / scale; ctx.setLineDash([6 / scale, 5 / scale]);
  for (const polygon of polygons) {
    ctx.beginPath();
    for (const ring of polygon) {
      ring.forEach((point, i) => i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
      ctx.closePath();
    }
    ctx.fill('evenodd'); ctx.stroke();
  }
  ctx.restore();
}
