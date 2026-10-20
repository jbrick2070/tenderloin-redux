"""Crop downloaded EPT LAZ nodes to the modeled area and reproject them into the game frame
for Roofer (build-time only; needs `pip install "laspy[lazrs]" numpy`).

EPSG:3857 -> WGS84 uses the exact inverse Web Mercator formula, then the game projection from
godot/data/SOURCES.md: X = (lon - lon0) * 111320 * cos(lat0), Z = -(lat - lat0) * 111320.
Roofer gets a right-handed frame: x = X (east), y = -Z (north); z stays in source metres.
The crop covers every footprint in buildings.json (opening + wider) plus a margin.

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
    blds = data["buildings"] + data.get("wider_buildings", [])
    xs = [p[0] for b in blds for poly in b["polygons"] for p in poly["rings"][0]]
    zs = [p[1] for b in blds for poly in b["polygons"] for p in poly["rings"][0]]
    x0, x1, z0, z1 = min(xs) - margin, max(xs) + margin, min(zs) - margin, max(zs) + margin
    parts = {"x": [], "y": [], "z": [], "c": [], "rn": [], "nr": []}
    for f in sorted(glob.glob(os.path.join(ept_dir, "*.laz"))):
        las = laspy.read(f)
        lon = np.degrees(np.asarray(las.x, dtype=np.float64) / R)
        lat = np.degrees(2.0 * np.arctan(np.exp(np.asarray(las.y, dtype=np.float64) / R)) - math.pi / 2.0)
        gx, gz = (lon - lon0) * k, -(lat - lat0) * 111320.0
        keep = (gx >= x0) & (gx <= x1) & (gz >= z0) & (gz <= z1)
        if keep.any():
            parts["x"].append(gx[keep]); parts["y"].append(-gz[keep])
            parts["z"].append(np.asarray(las.z, dtype=np.float64)[keep])
            parts["c"].append(np.asarray(las.classification, dtype=np.uint8)[keep])
            parts["rn"].append(np.asarray(las.return_number, dtype=np.uint8)[keep])
            parts["nr"].append(np.asarray(las.number_of_returns, dtype=np.uint8)[keep])
    cols = {key: np.concatenate(v) for key, v in parts.items()}
    order = np.lexsort((cols["z"], cols["y"], cols["x"]))
    hdr = laspy.LasHeader(point_format=6, version="1.4")
    hdr.scales = np.array([0.01, 0.01, 0.01])
    hdr.offsets = np.array([0.0, 0.0, 0.0])
    out = laspy.LasData(hdr)
    out.x, out.y, out.z = cols["x"][order], cols["y"][order], cols["z"][order]
    out.classification = cols["c"][order]
    out.return_number = cols["rn"][order]
    out.number_of_returns = cols["nr"][order]
    out.write(out_path)
    cls, n = np.unique(cols["c"], return_counts=True)
    print("points", len(order), "classes", dict(zip(cls.tolist(), n.tolist())))


main()
