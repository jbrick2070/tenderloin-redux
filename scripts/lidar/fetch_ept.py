"""Download the USGS 3DEP 2023 San Francisco LiDAR points for a lon/lat box (build-time only).

Source: USGS 3D Elevation Program, CA_SanFrancisco_1_B23 (collected 2023-04-20, published
2024-08-22), served as Entwine Point Tiles (LAZ, EPSG:3857) from the public AWS bucket
`usgs-lidar-public` (AWS Open Data registry "USGS 3DEP LiDAR Point Clouds", US Government
Public Domain). Only the octree nodes that intersect the box are fetched; nothing is committed
except the manifest (node keys, point counts, byte sizes, SHA-256).

Usage (standard library only):
  py -3 -I scripts/lidar/fetch_ept.py <out_dir> <lon_min> <lon_max> <lat_min> <lat_max> [manifest.json]
"""
import hashlib, json, math, os, sys, urllib.request

BASE = "https://s3-us-west-2.amazonaws.com/usgs-lidar-public/CA_SanFrancisco_1_B23/"
R = 6378137.0


def merc(lon, lat):
    return R * math.radians(lon), R * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


def get(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return r.read()


def main():
    out = sys.argv[1]
    lon0, lon1, lat0, lat1 = map(float, sys.argv[2:6])
    manifest_path = sys.argv[6] if len(sys.argv) > 6 else os.path.join(out, "manifest.json")
    os.makedirs(out, exist_ok=True)
    x0, y0 = merc(lon0, lat0)
    x1, y1 = merc(lon1, lat1)
    ept = json.loads(get(BASE + "ept.json"))
    b = ept["bounds"]
    hier = {}

    def hierarchy(key):
        if key not in hier:
            hier[key] = json.loads(get(BASE + "ept-hierarchy/" + key + ".json"))
        return hier[key]

    nodes = []
    stack = [("0-0-0-0", "0-0-0-0")]
    while stack:
        key, hfile = stack.pop()
        h = hierarchy(hfile)
        if key not in h:
            continue
        if h[key] == -1:
            stack.append((key, key))
            continue
        d, x, y, z = map(int, key.split("-"))
        size = (b[3] - b[0]) / (2 ** d)
        nx0, ny0 = b[0] + x * size, b[1] + y * size
        if nx0 + size < x0 or nx0 > x1 or ny0 + size < y0 or ny0 > y1:
            continue
        if h[key] > 0:
            nodes.append((key, h[key]))
        for dx in (0, 1):
            for dy in (0, 1):
                for dz in (0, 1):
                    stack.append(("%d-%d-%d-%d" % (d + 1, 2 * x + dx, 2 * y + dy, 2 * z + dz), hfile))
    manifest = []
    for i, (key, count) in enumerate(sorted(nodes)):
        path = os.path.join(out, key + ".laz")
        if not os.path.exists(path):
            with open(path, "wb") as f:
                f.write(get(BASE + "ept-data/" + key + ".laz"))
        with open(path, "rb") as f:
            digest = hashlib.sha256(f.read()).hexdigest()
        manifest.append({"key": key, "points": count, "bytes": os.path.getsize(path), "sha256": digest})
        if i % 50 == 0:
            print("node", i + 1, "/", len(nodes), flush=True)
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump({"source": BASE, "dataset": "USGS 3DEP CA_SanFrancisco_1_B23", "srs": "EPSG:3857",
                   "bbox_lonlat": [lon0, lon1, lat0, lat1], "nodes": manifest}, f, indent=1)
        f.write("\n")
    print("nodes", len(manifest), "points", sum(m["points"] for m in manifest), "bytes", sum(m["bytes"] for m in manifest))


main()
