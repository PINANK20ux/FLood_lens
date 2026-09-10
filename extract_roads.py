import osmnx as ox
import json

# 1. Fetch real drivable road network around central Hyderabad (Musi River / Abids / Koti)
print("Downloading real street geometry from OpenStreetMap...")
G = ox.graph_from_point((17.3850, 78.4867), dist=2500, network_type="drive")

# 2. Convert graph edges to a GeoPandas GeoDataFrame
nodes, edges = ox.graph_to_gdfs(G)

# Keep primary/secondary corridors to keep the map clean and fast
major_edges = edges[edges['highway'].isin(['primary', 'secondary', 'tertiary', 'trunk', 'primary_link', 'secondary_link'])].copy()

# 3. Add default status properties for SubZero
features = []
for idx, row in major_edges.iterrows():
    # GeoJSON expects [lon, lat]
    coords = [[round(coord[0], 6), round(coord[1], 6)] for coord in row.geometry.coords]
    features.append({
        "type": "Feature",
        "properties": {
            "road_id": f"R_{idx[0]}_{idx[1]}",
            "name": str(row.get('name', 'Urban Link')),
            "status": "SAFE",
            "depth_cm": 0,
            "submersion_ratio": 0
        },
        "geometry": {
            "type": "LineString",
            "coordinates": coords
        }
    })

geojson_data = {
    "type": "FeatureCollection",
    "features": features
}

# 4. Save directly for your backend
with open("backend/real_roads.json", "w") as f:
    json.dump(geojson_data, f)

print(f"Done! Saved {len(features)} real road segments matching asphalt centerlines.")