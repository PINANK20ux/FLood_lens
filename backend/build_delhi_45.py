import json

blocked_segments = [
    {
        "id": "delhi_minto_underpass",
        "name": "Minto Bridge Underpass Corridor",
        "status": "BLOCKED",
        "depth_cm": 62,
        "submersion_pct": 85,
        "length_m": 420,
        "coords": [[77.2205, 28.6348], [77.2215, 28.6335], [77.2219, 28.6328], [77.2226, 28.6318], [77.2235, 28.6305]]
    },
    {
        "id": "delhi_pragati_tunnel",
        "name": "Pragati Maidan Submerged Tunnel Stretch",
        "status": "BLOCKED",
        "depth_cm": 54,
        "submersion_pct": 78,
        "length_m": 680,
        "coords": [[77.2415, 28.6195], [77.2435, 28.6189], [77.2442, 28.6186], [77.2465, 28.6182], [77.2485, 28.6180]]
    },
    {
        "id": "delhi_ring_road_yamuna_low",
        "name": "Ring Road Low-Lying Yamuna Embankment",
        "status": "BLOCKED",
        "depth_cm": 70,
        "submersion_pct": 92,
        "length_m": 850,
        "coords": [[77.2480, 28.6380], [77.2492, 28.6340], [77.2505, 28.6300], [77.2512, 28.6250]]
    },
    {
        "id": "delhi_kashmere_gate_subway",
        "name": "Kashmere Gate Low-Level Subway Link",
        "status": "BLOCKED",
        "depth_cm": 48,
        "submersion_pct": 72,
        "length_m": 390,
        "coords": [[77.2270, 28.6675], [77.2285, 28.6665], [77.2300, 28.6655]]
    },
    {
        "id": "delhi_ito_subway_chute",
        "name": "ITO Vikas Marg Subway Dip",
        "status": "BLOCKED",
        "depth_cm": 58,
        "submersion_pct": 80,
        "length_m": 450,
        "coords": [[77.2440, 28.6292], [77.2458, 28.6290], [77.2480, 28.6288]]
    },
    {
        "id": "delhi_tilak_bridge_underpass",
        "name": "Tilak Bridge Railway Underpass",
        "status": "BLOCKED",
        "depth_cm": 45,
        "submersion_pct": 65,
        "length_m": 310,
        "coords": [[77.2360, 28.6260], [77.2375, 28.6255], [77.2390, 28.6250]]
    },
    {
        "id": "delhi_bhairon_marg_subway",
        "name": "Bhairon Marg Railway Subway",
        "status": "BLOCKED",
        "depth_cm": 50,
        "submersion_pct": 75,
        "length_m": 360,
        "coords": [[77.2460, 28.6140], [77.2475, 28.6135], [77.2490, 28.6130]]
    },
    {
        "id": "delhi_salimgarh_underpass",
        "name": "Salimgarh Bypass Underpass",
        "status": "BLOCKED",
        "depth_cm": 52,
        "submersion_pct": 74,
        "length_m": 400,
        "coords": [[77.2390, 28.6580], [77.2410, 28.6560], [77.2430, 28.6540]]
    }
]

caution_segments = [
    {
        "id": "delhi_ito_junction_approach",
        "name": "ITO Junction Western Approach",
        "status": "CAUTION",
        "depth_cm": 22,
        "submersion_pct": 40,
        "length_m": 550,
        "coords": [[77.2350, 28.6295], [77.2380, 28.6292], [77.2407, 28.6289]]
    },
    {
        "id": "delhi_kashmere_gate_lower",
        "name": "Kashmere Gate Lower Approach",
        "status": "CAUTION",
        "depth_cm": 18,
        "submersion_pct": 32,
        "length_m": 600,
        "coords": [[77.2250, 28.6690], [77.2270, 28.6675], [77.2285, 28.6665]]
    },
    {
        "id": "delhi_sarai_kale_khan_link",
        "name": "Sarai Kale Khan Low Transition Link",
        "status": "CAUTION",
        "depth_cm": 24,
        "submersion_pct": 42,
        "length_m": 720,
        "coords": [[77.2530, 28.5920], [77.2550, 28.5880], [77.2570, 28.5840]]
    },
    {
        "id": "delhi_mathura_rd_low",
        "name": "Mathura Road Low-Lying Transition",
        "status": "CAUTION",
        "depth_cm": 20,
        "submersion_pct": 35,
        "length_m": 650,
        "coords": [[77.2410, 28.6180], [77.2420, 28.6140], [77.2430, 28.6100]]
    },
    {
        "id": "delhi_shanti_van_approach",
        "name": "Ring Road Shanti Van Approach",
        "status": "CAUTION",
        "depth_cm": 25,
        "submersion_pct": 44,
        "length_m": 780,
        "coords": [[77.2440, 28.6480], [77.2460, 28.6440], [77.2470, 28.6400]]
    },
    {
        "id": "delhi_rajghat_power_link",
        "name": "Rajghat Power House Corridor",
        "status": "CAUTION",
        "depth_cm": 19,
        "submersion_pct": 33,
        "length_m": 520,
        "coords": [[77.2450, 28.6400], [77.2470, 28.6360], [77.2480, 28.6330]]
    },
    {
        "id": "delhi_vikas_marg_ramp",
        "name": "Vikas Marg Yamuna Bridge Ramp",
        "status": "CAUTION",
        "depth_cm": 26,
        "submersion_pct": 46,
        "length_m": 800,
        "coords": [[77.2510, 28.6285], [77.2560, 28.6280], [77.2620, 28.6282]]
    },
    {
        "id": "delhi_delhi_gate_approach",
        "name": "Delhi Gate South Approach",
        "status": "CAUTION",
        "depth_cm": 16,
        "submersion_pct": 28,
        "length_m": 480,
        "coords": [[77.2400, 28.6410], [77.2405, 28.6380], [77.2407, 28.6340]]
    },
    {
        "id": "delhi_sikandra_rd_transition",
        "name": "Sikandra Road Transition Link",
        "status": "CAUTION",
        "depth_cm": 15,
        "submersion_pct": 25,
        "length_m": 430,
        "coords": [[77.2340, 28.6250], [77.2370, 28.6240], [77.2390, 28.6235]]
    },
    {
        "id": "delhi_ip_flyover_approach",
        "name": "IP Estate Flyover Surface Approach",
        "status": "CAUTION",
        "depth_cm": 21,
        "submersion_pct": 36,
        "length_m": 590,
        "coords": [[77.2480, 28.6250], [77.2490, 28.6220], [77.2500, 28.6190]]
    },
    {
        "id": "delhi_yamuna_bazar_corridor",
        "name": "Yamuna Bazar Ghat Corridor",
        "status": "CAUTION",
        "depth_cm": 27,
        "submersion_pct": 48,
        "length_m": 510,
        "coords": [[77.2350, 28.6640], [77.2380, 28.6620], [77.2400, 28.6600]]
    },
    {
        "id": "delhi_daryaganj_low_link",
        "name": "Daryaganj Ring Road Feeder",
        "status": "CAUTION",
        "depth_cm": 17,
        "submersion_pct": 30,
        "length_m": 470,
        "coords": [[77.2410, 28.6470], [77.2430, 28.6450], [77.2440, 28.6430]]
    }
]

safe_segments = [
    {
        "id": "delhi_cp_inner_north",
        "name": "Connaught Place Inner Circle (North)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 450,
        "coords": [[77.2160, 28.6335], [77.2185, 28.6342], [77.2210, 28.6332]]
    },
    {
        "id": "delhi_cp_inner_south",
        "name": "Connaught Place Inner Circle (South)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 450,
        "coords": [[77.2210, 28.6332], [77.2205, 28.6300], [77.2160, 28.6295], [77.2135, 28.6315]]
    },
    {
        "id": "delhi_cp_outer_circle",
        "name": "Connaught Place Outer Circle (Connaught Circus)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 1200,
        "coords": [[77.2130, 28.6350], [77.2180, 28.6360], [77.2230, 28.6345], [77.2240, 28.6290], [77.2190, 28.6280], [77.2130, 28.6290]]
    },
    {
        "id": "delhi_janpath_north",
        "name": "Janpath (CP to Windsor Place)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 750,
        "coords": [[77.2185, 28.6300], [77.2188, 28.6250], [77.2190, 28.6210]]
    },
    {
        "id": "delhi_janpath_south",
        "name": "Janpath (Windsor Place to National Museum)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 800,
        "coords": [[77.2190, 28.6210], [77.2192, 28.6160], [77.2195, 28.6110]]
    },
    {
        "id": "delhi_ashoka_road",
        "name": "Ashoka Road (Gol Dak Khana to India Gate)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 1600,
        "coords": [[77.2090, 28.6250], [77.2140, 28.6210], [77.2200, 28.6180], [77.2260, 28.6150]]
    },
    {
        "id": "delhi_barakhamba_road",
        "name": "Barakhamba Road (CP to Mandi House)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 900,
        "coords": [[77.2220, 28.6315], [77.2280, 28.6275], [77.2340, 28.6250]]
    },
    {
        "id": "delhi_kg_marg",
        "name": "Kasturba Gandhi Marg",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 1100,
        "coords": [[77.2205, 28.6305], [77.2230, 28.6240], [77.2250, 28.6180]]
    },
    {
        "id": "delhi_sansad_marg",
        "name": "Parliament Street (Sansad Marg)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 950,
        "coords": [[77.2160, 28.6295], [77.2110, 28.6230], [77.2080, 28.6190]]
    },
    {
        "id": "delhi_bks_marg",
        "name": "Baba Kharak Singh Marg",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 900,
        "coords": [[77.2140, 28.6315], [77.2100, 28.6275], [77.2060, 28.6240]]
    },
    {
        "id": "delhi_india_gate_c_hexagon",
        "name": "India Gate C-Hexagon Outer Roundabout",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 1400,
        "coords": [[77.2270, 28.6150], [77.2310, 28.6140], [77.2330, 28.6115], [77.2305, 28.6090], [77.2260, 28.6100], [77.2250, 28.6130]]
    },
    {
        "id": "delhi_kartavya_path_east",
        "name": "Kartavya Path (India Gate to Janpath)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 900,
        "coords": [[77.2280, 28.6125], [77.2230, 28.6125], [77.2192, 28.6125]]
    },
    {
        "id": "delhi_kartavya_path_west",
        "name": "Kartavya Path (Janpath to Vijay Chowk)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 850,
        "coords": [[77.2192, 28.6125], [77.2140, 28.6125], [77.2085, 28.6125]]
    },
    {
        "id": "delhi_akbar_road",
        "name": "Akbar Road (India Gate to Teen Murti)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 1500,
        "coords": [[77.2260, 28.6100], [77.2200, 28.6070], [77.2130, 28.6030], [77.2050, 28.6010]]
    },
    {
        "id": "delhi_tilak_marg_safe",
        "name": "Tilak Marg High Elevation Stretch",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 980,
        "coords": [[77.2310, 28.6150], [77.2340, 28.6210], [77.2350, 28.6240]]
    },
    {
        "id": "delhi_barapullah_elevated_west",
        "name": "Barapullah Elevated Expressway (West)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 1800,
        "coords": [[77.2250, 28.5820], [77.2350, 28.5830], [77.2450, 28.5830]]
    },
    {
        "id": "delhi_barapullah_elevated_east",
        "name": "Barapullah Elevated Expressway (East Link)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 1200,
        "coords": [[77.2450, 28.5830], [77.2510, 28.5825], [77.2560, 28.5820]]
    },
    {
        "id": "delhi_lodhi_road",
        "name": "Lodhi Road (Safdarjung to Nizamuddin)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 1700,
        "coords": [[77.2150, 28.5900], [77.2260, 28.5890], [77.2380, 28.5880], [77.2460, 28.5885]]
    },
    {
        "id": "delhi_aurobindo_marg",
        "name": "Sri Aurobindo Marg (AIIMS to Safdarjung)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 1300,
        "coords": [[77.2080, 28.5680], [77.2090, 28.5770], [77.2100, 28.5860]]
    },
    {
        "id": "delhi_aiims_flyover",
        "name": "Ring Road AIIMS Elevated Flyover",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 900,
        "coords": [[77.2000, 28.5690], [77.2090, 28.5690], [77.2180, 28.5690]]
    },
    {
        "id": "delhi_sardar_patel_marg",
        "name": "Sardar Patel Marg (Dhaula Kuan Ridge)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 1900,
        "coords": [[77.1700, 28.5950], [77.1850, 28.6030], [77.1980, 28.6100]]
    },
    {
        "id": "delhi_tolstoy_marg",
        "name": "Tolstoy Marg (Janpath to Barakhamba)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 850,
        "coords": [[77.2190, 28.6255], [77.2240, 28.6265], [77.2290, 28.6270]]
    },
    {
        "id": "delhi_ferozeshah_road",
        "name": "Ferozeshah Road (Windsor Place to Mandi House)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 1100,
        "coords": [[77.2190, 28.6210], [77.2270, 28.6225], [77.2340, 28.6245]]
    },
    {
        "id": "delhi_mandi_house_circle",
        "name": "Mandi House Cultural Hub Circle",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 500,
        "coords": [[77.2340, 28.6255], [77.2355, 28.6250], [77.2350, 28.6240], [77.2335, 28.6245]]
    },
    {
        "id": "delhi_copernicus_marg",
        "name": "Copernicus Marg (Mandi House to C-Hexagon)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 920,
        "coords": [[77.2340, 28.6245], [77.2310, 28.6190], [77.2280, 28.6145]]
    }
]

print(f"Blocked: {len(blocked_segments)}")
print(f"Caution: {len(caution_segments)}")
print(f"Safe: {len(safe_segments)}")
total = len(blocked_segments) + len(caution_segments) + len(safe_segments)
print(f"Total: {total}")

features = []
for s in blocked_segments:
    features.append({
        "type": "Feature",
        "properties": {
            "id": s["id"],
            "road_id": s["id"],
            "name": s["name"],
            "status": "BLOCKED",
            "depth_cm": s["depth_cm"],
            "submersion_pct": s["submersion_pct"],
            "submersion_ratio": s["submersion_pct"],
            "length_m": s["length_m"],
            "elevation_sink": True
        },
        "geometry": {
            "type": "LineString",
            "coordinates": s["coords"]
        }
    })

for s in caution_segments:
    features.append({
        "type": "Feature",
        "properties": {
            "id": s["id"],
            "road_id": s["id"],
            "name": s["name"],
            "status": "CAUTION",
            "depth_cm": s["depth_cm"],
            "submersion_pct": s["submersion_pct"],
            "submersion_ratio": s["submersion_pct"],
            "length_m": s["length_m"],
            "elevation_sink": False
        },
        "geometry": {
            "type": "LineString",
            "coordinates": s["coords"]
        }
    })

for s in safe_segments:
    features.append({
        "type": "Feature",
        "properties": {
            "id": s["id"],
            "road_id": s["id"],
            "name": s["name"],
            "status": "SAFE",
            "depth_cm": 0,
            "submersion_pct": 0,
            "submersion_ratio": 0,
            "length_m": s["length_m"],
            "elevation_sink": False
        },
        "geometry": {
            "type": "LineString",
            "coordinates": s["coords"]
        }
    })

geojson = {
    "type": "FeatureCollection",
    "features": features
}

stats = {
    "total": 45,
    "safe": 25,
    "caution": 12,
    "blocked": 8
}

dataset = {
    "stats": stats,
    "geojson": geojson,
    "source": "central_delhi_pilot_deployment"
}

with open("c:/Users/krish/Documents/Code/Models/backend/real_roads.json", "w", encoding="utf-8") as f:
    json.dump(dataset, f, indent=2)

print("Wrote backend/real_roads.json successfully")
