import requests
import json
import math
import uuid
from pathlib import Path

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

YAMUNA_CORRIDOR = [
    [28.6750, 77.2340],  # Nigambodh Ghat / Kashmere Gate
    [28.6650, 77.2370],  # Salimgarh / Old Bridge
    [28.6500, 77.2450],  # Geeta Colony / Shanti Van
    [28.6380, 77.2480],  # Raj Ghat
    [28.6290, 77.2500],  # ITO Barrage / Ring Road
    [28.6180, 77.2510],  # Pragati Maidan / Bhairon Marg
    [28.6050, 77.2540],  # Millennium Park
    [28.5900, 77.2570],  # Nizamuddin / Yamuna Bank
]

DELHI_DEPRESSIONS = [
    [28.6328, 77.2219],  # Minto Bridge Underpass
    [28.6186, 77.2442],  # Pragati Maidan Underpass
    [28.6289, 77.2407],  # ITO Ring Road / Vikas Marg
    [28.6665, 77.2285],  # Kashmere Gate ISBT Ring Road
    [28.6120, 77.2460],  # Bhairon Marg Underpass
    [28.6270, 77.2360],  # Tilak Bridge Underpass
]

def min_dist_to_flood_zone(lat, lng):
    min_d = float("inf")
    for ylat, ylng in YAMUNA_CORRIDOR:
        d = haversine(lat, lng, ylat, ylng)
        if d < min_d:
            min_d = d
    for dlat, dlng in DELHI_DEPRESSIONS:
        d = haversine(lat, lng, dlat, dlng)
        if d < min_d:
            min_d = d
    return min_d

# Query Overpass for Central Delhi
query = """[out:json][timeout:30];(way["highway"~"primary|secondary|tertiary|trunk"](28.58,77.19,28.67,77.26););out geom 350;"""
headers = {"User-Agent": "FloodLens-Emergency-GIS/2.0"}
endpoints = [
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://z.overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
]

elements = []
for ep in endpoints:
    try:
        print(f"Fetching from {ep}...")
        resp = requests.post(ep, data={"data": query}, headers=headers, timeout=30)
        if resp.status_code == 200:
            data = resp.json()
            elements = data.get("elements", [])
            print(f"Loaded {len(elements)} elements from {ep}")
            if len(elements) >= 100:
                break
    except Exception as e:
        print(f"Failed {ep}: {e}")

if not elements:
    raise RuntimeError("No elements returned from Overpass!")

raw_roads = []
for elem in elements:
    geom = elem.get("geometry", [])
    if len(geom) < 2:
        continue
    coords = [[round(pt["lon"], 6), round(pt["lat"], 6)] for pt in geom]
    tags = elem.get("tags", {})
    name = tags.get("name") or tags.get("ref") or f"{tags.get('highway', 'Arterial').capitalize()} Road"
    
    length_m = 0.0
    for i in range(len(coords) - 1):
        length_m += haversine(coords[i][1], coords[i][0], coords[i+1][1], coords[i+1][0])
    length_m = max(round(length_m, 1), 10.0)
    
    mid = coords[len(coords) // 2]
    mid_lng, mid_lat = mid[0], mid[1]
    d_flood = min_dist_to_flood_zone(mid_lat, mid_lng)
    
    wid = f"delhi_{elem.get('id', uuid.uuid4().hex[:8])}"
    raw_roads.append({
        "id": wid,
        "name": name,
        "coords": coords,
        "length_m": length_m,
        "mid_lat": mid_lat,
        "mid_lng": mid_lng,
        "d_flood": d_flood,
        "highway": tags.get("highway", "road"),
    })

# Select top 300 representative roads
# Sort to ensure we have a good spatial spread across Central Delhi
raw_roads.sort(key=lambda r: (r["d_flood"]))
total_roads = min(300, len(raw_roads))
selected_roads = raw_roads[:total_roads]

# Target split:
# 15% BLOCKED (~45)
# 20% CAUTION (~60)
# 65% SAFE (~195)
num_blocked = int(round(total_roads * 0.15))
num_caution = int(round(total_roads * 0.20))
num_safe = total_roads - num_blocked - num_caution

features = []
# Roads with smallest d_flood get BLOCKED
for i, road in enumerate(selected_roads):
    if i < num_blocked:
        status = "BLOCKED"
        # Depth 45-70 cm
        depth_cm = int(45 + round(25 * (1.0 - (i / max(1, num_blocked)))))
    elif i < num_blocked + num_caution:
        status = "CAUTION"
        # Depth 15-25 cm
        offset = i - num_blocked
        depth_cm = int(15 + round(10 * (1.0 - (offset / max(1, num_caution)))))
    else:
        status = "SAFE"
        depth_cm = 0
        
    sub_pct = min(100, int(round((depth_cm / 65.0) * 100)))
    
    features.append({
        "type": "Feature",
        "properties": {
            "id": road["id"],
            "road_id": road["id"],
            "name": road["name"],
            "highway": road["highway"],
            "length_m": road["length_m"],
            "status": status,
            "depth_cm": depth_cm,
            "submersion_ratio": sub_pct,
            "submersion_pct": sub_pct,
            "elevation_sink": status != "SAFE",
            "d_flood": round(road["d_flood"], 1),
        },
        "geometry": {
            "type": "LineString",
            "coordinates": road["coords"]
        }
    })

geojson = {
    "type": "FeatureCollection",
    "features": features
}

output_path = Path("real_roads.json")
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(geojson, f, indent=2)

stats = {"total": len(features), "safe": sum(1 for f in features if f["properties"]["status"] == "SAFE"), "caution": sum(1 for f in features if f["properties"]["status"] == "CAUTION"), "blocked": sum(1 for f in features if f["properties"]["status"] == "BLOCKED")}
print(f"Generated {output_path}: {stats}")
