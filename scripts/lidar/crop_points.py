"""Crop downloaded EPT LAZ nodes to the modeled area and reproject them into the game frame
for Roofer (build-time only; needs `pip install "laspy[lazrs]" numpy`).

EPSG:3857 -> WGS84 uses the exact inverse Web Mercator formula, then the game projection from
godot/data/SOURCES.md: X = (lon - lon0) * 111320 * cos(lat0), Z = -(lat - lat0) * 111320.
Roofer gets a right-handed frame: x = X (east), y = -Z (north); z stays in source metres.

Usage: python -I scripts/lidar/crop_points.py <ept_dir> <buildings.json> <out.laz> [margin_m]
"""
import glob, json, math, os, sys
import numpy as np
import laspy

R = 6378137.0


def main():
    ept_dir, bpath, out_path = sys.argv[1:4]
    margin = float(sys.argv[4]) if len(sys.argv) > 4 else 25.0
    data = json.load(open(bpath, encoding="utf-8"))
    lat0, lon0 = data["origin"]["lat"], data["origin"]["lon"]
    k = 111320.0 * math.cos(math.radians(lat0))
    xs = [p[0] for b in data["buildings"] for poly in b["polygons"] for p in poly["rings"][0]]
    zs = [p[1] for b in data["buildings"] for poly in b["polygons"] for p in poly["rings"][0]]
    x0, x1, z0, z1 = min(xs) - margin, max(xs) + margin, min(zs) - margin, max(zs) + margin
    cols = []
    for f in sorted(glob.glob(os.path.join(ept_dir, "*.laz"))):
        las = laspy.read(f)
        lon = np.degrees(np.asarray(las.x, dtype=np.float64) / R)
        lat = np.degrees(2.0 * np.arctan(np.exp(np.asarray(las.y, dtype=np.float64) / R)) - math.pi / 2.0)
        gx, gz = (lon - lon0) * k, -(lat - lat0) * 111320.0
        keep = (gx >= x0) & (gx <= x1) & (gz >= z0) & (gz <= z1)
        if keep.any():
            cols.append(np.stack([gx[keep], -gz[keep], np.asarray(las.z, dtype=np.float64)[keep],
                                  np.asarray(las.classification)[keep], np.asarray(las.return_number)[keep],
                                  np.asarray(las.number_of_returns)[keep]], axis=1))
    pts = np.concatenate(cols)
    pts = pts[np.lexsort((pts[:, 2], pts[:, 1], pts[:, 0]))]
    hdr = laspy.LasHeader(point_format=6, version="1.4")
    hdr.scales = np.array([0.01, 0.01, 0.01])
    hdr.offsets = np.array([0.0, 0.0, 0.0])
    out = laspy.LasData(hdr)
    out.x, out.y, out.z = pts[:, 0], pts[:, 1], pts[:, 2]
    out.classification = pts[:, 3].astype(np.uint8)
    out.return_number = pts[:, 4].astype(np.uint8)
    out.number_of_returns = pts[:, 5].astype(np.uint8)
    out.write(out_path)
    cls, n = np.unique(pts[:, 3].astype(int), return_counts=True)
    print("points", len(pts), "classes", dict(zip(cls.tolist(), n.tolist())))


main()
