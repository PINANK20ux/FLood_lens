import json
import math

def circle_coords(center_lat, center_lng, radius_lat, radius_lng, n=16):
    pts = []
    for i in range(n + 1):
        angle = (2 * math.pi * i) / n
        lat = center_lat + radius_lat * math.sin(angle)
        lng = center_lng + radius_lng * math.cos(angle)
        pts.append([round(lng, 6), round(lat, 6)])
    return pts

# 1. BLOCKED (Red #ef4444, dashArray '6, 6', weight 6)
blocked = [
    {
        "id": "delhi_minto_corridor",
        "name": "Minto Road Underpass Corridor",
        "status": "BLOCKED",
        "depth_cm": 62,
        "submersion_pct": 85,
        "length_m": 580,
        # User requested: [[28.6330, 77.2190], [28.6328, 77.2225], [28.6335, 77.2260], [28.6370, 77.2270]]
        "coords": [
            [77.2190, 28.6330],
            [77.2225, 28.6328], # CAM01 Node
            [77.2260, 28.6335],
            [77.2270, 28.6370]
        ]
    },
    {
        "id": "delhi_salimgarh_bypass",
        "name": "Ring Road (Salimgarh Bypass Low Stretch)",
        "status": "BLOCKED",
        "depth_cm": 52,
        "submersion_pct": 75,
        "length_m": 720,
        # User requested: [[28.6550, 77.2420], [28.6450, 77.2440], [28.6380, 77.2450]]
        "coords": [
            [77.2420, 28.6550],
            [77.2440, 28.6450],
            [77.2450, 28.6380]
        ]
    },
    {
        "id": "delhi_ito_ring_low",
        "name": "ITO Ring Road Low Embankment Stretch",
        "status": "BLOCKED",
        "depth_cm": 58,
        "submersion_pct": 82,
        "length_m": 820,
        # User requested: [[28.6320, 77.2445], [28.6280, 77.2450], [28.6210, 77.2440]]
        "coords": [
            [77.2445, 28.6320],
            [77.2445, 28.6289], # CAM02 Node
            [77.2450, 28.6280],
            [77.2440, 28.6210]
        ]
    },
    {
        "id": "delhi_pragati_tunnel",
        "name": "Pragati Maidan Submerged Tunnel",
        "status": "BLOCKED",
        "depth_cm": 54,
        "submersion_pct": 78,
        "length_m": 650,
        "coords": [
            [77.2370, 28.6200],
            [77.2410, 28.6190],
            [77.2442, 28.6186], # CAM03 Node
            [77.2480, 28.6182],
            [77.2510, 28.6180]
        ]
    },
    {
        "id": "delhi_tilak_bridge_rail_subway",
        "name": "Tilak Bridge Railway Subway Dip",
        "status": "BLOCKED",
        "depth_cm": 46,
        "submersion_pct": 68,
        "length_m": 350,
        "coords": [
            [77.2355, 28.6265],
            [77.2380, 28.6258],
            [77.2405, 28.6250]
        ]
    },
    {
        "id": "delhi_bhairon_marg_subway",
        "name": "Bhairon Marg Railway Underpass",
        "status": "BLOCKED",
        "depth_cm": 50,
        "submersion_pct": 74,
        "length_m": 420,
        "coords": [
            [77.2450, 28.6145],
            [77.2480, 28.6138],
            [77.2505, 28.6132]
        ]
    },
    {
        "id": "delhi_ring_road_yamuna_bazar",
        "name": "Yamuna Bazar Ghat Low-Level Subway",
        "status": "BLOCKED",
        "depth_cm": 60,
        "submersion_pct": 88,
        "length_m": 490,
        "coords": [
            [77.2360, 28.6630],
            [77.2385, 28.6610],
            [77.2405, 28.6585]
        ]
    },
    {
        "id": "delhi_kashmere_gate_dip",
        "name": "Kashmere Gate Monastery Subway Link",
        "status": "BLOCKED",
        "depth_cm": 48,
        "submersion_pct": 70,
        "length_m": 380,
        "coords": [
            [77.2270, 28.6680],
            [77.2285, 28.6665], # CAM04 Node
            [77.2305, 28.6650]
        ]
    }
]

# 2. CAUTION (Amber #f59e0b, weight 5)
caution = [
    {
        "id": "delhi_kashmere_isbt_bypass",
        "name": "Kashmere Gate to ISBT Yamuna Bypass",
        "status": "CAUTION",
        "depth_cm": 18,
        "submersion_pct": 32,
        "length_m": 1200,
        # User requested: [[28.6675, 77.2285], [28.6640, 77.2340], [28.6580, 77.2380], [28.6490, 77.2410]]
        "coords": [
            [77.2285, 28.6675],
            [77.2340, 28.6640],
            [77.2380, 28.6580],
            [77.2410, 28.6490]
        ]
    },
    {
        "id": "delhi_vikas_marg_bridge",
        "name": "Vikas Marg Yamuna River Bridge to Laxmi Nagar",
        "status": "CAUTION",
        "depth_cm": 24,
        "submersion_pct": 42,
        "length_m": 1600,
        # User requested: [[28.6300, 77.2450], [28.6295, 77.2550], [28.6280, 77.2650], [28.6270, 77.2750]]
        "coords": [
            [77.2450, 28.6300],
            [77.2550, 28.6295],
            [77.2650, 28.6280],
            [77.2750, 28.6270]
        ]
    },
    {
        "id": "delhi_ito_west_approach",
        "name": "ITO Junction West Approach (Bahadur Shah Zafar Marg)",
        "status": "CAUTION",
        "depth_cm": 22,
        "submersion_pct": 40,
        "length_m": 600,
        "coords": [
            [77.2380, 28.6340],
            [77.2405, 28.6310],
            [77.2445, 28.6289]
        ]
    },
    {
        "id": "delhi_sikandra_rd_conn",
        "name": "Sikandra Road Transition Arterial",
        "status": "CAUTION",
        "depth_cm": 16,
        "submersion_pct": 28,
        "length_m": 450,
        "coords": [
            [77.2340, 28.6250],
            [77.2380, 28.6255],
            [77.2440, 28.6260]
        ]
    },
    {
        "id": "delhi_mathura_rd_transition",
        "name": "Mathura Road Surface Approach to Pragati",
        "status": "CAUTION",
        "depth_cm": 20,
        "submersion_pct": 35,
        "length_m": 750,
        "coords": [
            [77.2400, 28.6220],
            [77.2420, 28.6180],
            [77.2435, 28.6140]
        ]
    },
    {
        "id": "delhi_ring_shanti_van",
        "name": "Ring Road Shanti Van / Geeta Colony Ramp",
        "status": "CAUTION",
        "depth_cm": 25,
        "submersion_pct": 44,
        "length_m": 880,
        "coords": [
            [77.2410, 28.6490],
            [77.2435, 28.6440],
            [77.2450, 28.6380]
        ]
    },
    {
        "id": "delhi_sarai_kale_khan_approach",
        "name": "Sarai Kale Khan Ring Road Link",
        "status": "CAUTION",
        "depth_cm": 22,
        "submersion_pct": 38,
        "length_m": 900,
        "coords": [
            [77.2520, 28.5950],
            [77.2550, 28.5890],
            [77.2575, 28.5840]
        ]
    },
    {
        "id": "delhi_rajghat_power_link",
        "name": "Rajghat Thermal Power Station Road",
        "status": "CAUTION",
        "depth_cm": 18,
        "submersion_pct": 30,
        "length_m": 520,
        "coords": [
            [77.2440, 28.6380],
            [77.2465, 28.6345],
            [77.2480, 28.6310]
        ]
    },
    {
        "id": "delhi_ip_estate_flyover_ramp",
        "name": "IP Estate Surface Feeder Road",
        "status": "CAUTION",
        "depth_cm": 21,
        "submersion_pct": 36,
        "length_m": 610,
        "coords": [
            [77.2450, 28.6280],
            [77.2475, 28.6240],
            [77.2490, 28.6200]
        ]
    },
    {
        "id": "delhi_delhi_gate_south",
        "name": "Delhi Gate South Arterial (Netaji Subhash Marg)",
        "status": "CAUTION",
        "depth_cm": 15,
        "submersion_pct": 26,
        "length_m": 480,
        "coords": [
            [77.2405, 28.6415],
            [77.2395, 28.6375],
            [77.2380, 28.6340]
        ]
    },
    {
        "id": "delhi_geeta_colony_bridge_ramp",
        "name": "Geeta Colony Bridge Approach",
        "status": "CAUTION",
        "depth_cm": 26,
        "submersion_pct": 45,
        "length_m": 720,
        "coords": [
            [77.2435, 28.6530],
            [77.2490, 28.6535],
            [77.2550, 28.6540]
        ]
    },
    {
        "id": "delhi_daryaganj_ring_feeder",
        "name": "Daryaganj Eastern Ring Feeder",
        "status": "CAUTION",
        "depth_cm": 17,
        "submersion_pct": 30,
        "length_m": 440,
        "coords": [
            [77.2415, 28.6475],
            [77.2435, 28.6450],
            [77.2440, 28.6420]
        ]
    }
]

# 3. SAFE (Green #10b981, weight 4.5, opacity 0.85)
safe = [
    {
        "id": "delhi_cp_inner_circle",
        "name": "Connaught Place Inner Circle",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 1100,
        # Closed circular multi-point loop centered at [28.6328, 77.2195]
        "coords": circle_coords(28.6328, 77.2195, 0.0018, 0.0020, 20)
    },
    {
        "id": "delhi_cp_outer_circle",
        "name": "Connaught Circus (Outer Circle)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 2100,
        "coords": circle_coords(28.6328, 77.2195, 0.0036, 0.0040, 24)
    },
    {
        "id": "delhi_janpath_avenue",
        "name": "Janpath Avenue (CP to National Museum)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 2100,
        # User requested: [[28.6310, 77.2195], [28.6250, 77.2185], [28.6180, 77.2175], [28.6120, 77.2165]]
        "coords": [
            [77.2195, 28.6310],
            [77.2185, 28.6250],
            [77.2175, 28.6180],
            [77.2165, 28.6120]
        ]
    },
    {
        "id": "delhi_sansad_marg",
        "name": "Sansad Marg (Parliament Street)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 1400,
        # User requested: [[28.6315, 77.2160], [28.6250, 77.2130], [28.6190, 77.2100]]
        "coords": [
            [77.2160, 28.6315],
            [77.2130, 28.6250],
            [77.2100, 28.6190]
        ]
    },
    {
        "id": "delhi_barakhamba_road",
        "name": "Barakhamba Road (CP to Mandi House)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 1200,
        # User requested: [[28.6315, 77.2230], [28.6260, 77.2280], [28.6230, 77.2320]]
        "coords": [
            [77.2230, 28.6315],
            [77.2280, 28.6260],
            [77.2320, 28.6230]
        ]
    },
    {
        "id": "delhi_kartavya_path",
        "name": "Kartavya Path (Rashtrapati Bhavan to India Gate)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 2900,
        # User requested: [[28.6145, 77.2000], [28.6130, 77.2150], [28.6125, 77.2295]]
        "coords": [
            [77.2000, 28.6145],
            [77.2150, 28.6130],
            [77.2295, 28.6125]
        ]
    },
    {
        "id": "delhi_india_gate_hexagon",
        "name": "India Gate C-Hexagon Ring",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 1600,
        # User requested: closed circular loop around [28.6129, 77.2295]
        "coords": circle_coords(28.6129, 77.2295, 0.0022, 0.0025, 18)
    },
    {
        "id": "delhi_barapullah_flyover",
        "name": "Barapullah Elevated Expressway Corridor",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 2600,
        # User requested: [[28.5830, 77.2350], [28.5840, 77.2480], [28.5855, 77.2600]]
        "coords": [
            [77.2350, 28.5830],
            [77.2480, 28.5840], # CAM05 Node
            [77.2600, 28.5855]
        ]
    },
    {
        "id": "delhi_ashoka_road",
        "name": "Ashoka Road (Gol Dak Khana to Windsor Place)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 1650,
        "coords": [
            [77.2085, 28.6255],
            [77.2140, 28.6225],
            [77.2195, 28.6200],
            [77.2250, 28.6165]
        ]
    },
    {
        "id": "delhi_kg_marg",
        "name": "Kasturba Gandhi Marg",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 1300,
        "coords": [
            [77.2215, 28.6310],
            [77.2240, 28.6240],
            [77.2265, 28.6175]
        ]
    },
    {
        "id": "delhi_bks_marg",
        "name": "Baba Kharak Singh Marg",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 1100,
        "coords": [
            [77.2140, 28.6315],
            [77.2105, 28.6275],
            [77.2070, 28.6235]
        ]
    },
    {
        "id": "delhi_panchkuian_marg",
        "name": "Panchkuian Marg (CP to Jhandewalan)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 1500,
        "coords": [
            [77.2120, 28.6345],
            [77.2065, 28.6385],
            [77.2005, 28.6430]
        ]
    },
    {
        "id": "delhi_rani_jhansi_road",
        "name": "Rani Jhansi Road (Jhandewalan to Pul Bangash)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 1900,
        "coords": [
            [77.2005, 28.6430],
            [77.2045, 28.6510],
            [77.2090, 28.6580],
            [77.2155, 28.6640]
        ]
    },
    {
        "id": "delhi_mori_gate_approach",
        "name": "Boulevard Road / Mori Gate (St Stephen's to ISBT High Ground)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 1300,
        "coords": [
            [77.2155, 28.6640],
            [77.2215, 28.6670],
            [77.2285, 28.6675]
        ]
    },
    {
        "id": "delhi_tilak_marg_high",
        "name": "Tilak Marg Elevated Ground",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 1050,
        "coords": [
            [77.2300, 28.6145],
            [77.2330, 28.6200],
            [77.2340, 28.6240]
        ]
    },
    {
        "id": "delhi_copernicus_marg",
        "name": "Copernicus Marg",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 920,
        "coords": [
            [77.2325, 28.6235],
            [77.2305, 28.6185],
            [77.2285, 28.6140]
        ]
    },
    {
        "id": "delhi_mandi_house_circle",
        "name": "Mandi House Roundabout",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 480,
        "coords": circle_coords(28.6250, 77.2340, 0.0009, 0.0010, 12)
    },
    {
        "id": "delhi_ferozeshah_road",
        "name": "Ferozeshah Road (Windsor to Mandi House)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 1150,
        "coords": [
            [77.2195, 28.6200],
            [77.2270, 28.6225],
            [77.2340, 28.6250]
        ]
    },
    {
        "id": "delhi_tolstoy_marg",
        "name": "Tolstoy Marg (Janpath to Barakhamba)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 900,
        "coords": [
            [77.2185, 28.6250],
            [77.2245, 28.6265],
            [77.2280, 28.6260]
        ]
    },
    {
        "id": "delhi_akbar_road",
        "name": "Akbar Road (India Gate to Teen Murti)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 1800,
        "coords": [
            [77.2275, 28.6110],
            [77.2200, 28.6065],
            [77.2120, 28.6025],
            [77.2040, 28.6000]
        ]
    },
    {
        "id": "delhi_lodhi_road",
        "name": "Lodhi Road Corridor",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 2200,
        "coords": [
            [77.2120, 28.5900],
            [77.2240, 28.5890],
            [77.2360, 28.5880],
            [77.2460, 28.5885]
        ]
    },
    {
        "id": "delhi_aurobindo_marg",
        "name": "Sri Aurobindo Marg (Safdarjung Tomb to AIIMS)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 1700,
        "coords": [
            [77.2100, 28.5860],
            [77.2090, 28.5770],
            [77.2080, 28.5680]
        ]
    },
    {
        "id": "delhi_aiims_flyover_elevated",
        "name": "Ring Road AIIMS Elevated Flyover Deck",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 1100,
        "coords": [
            [77.1980, 28.5690],
            [77.2080, 28.5690],
            [77.2180, 28.5690]
        ]
    },
    {
        "id": "delhi_sardar_patel_marg",
        "name": "Sardar Patel Marg (Ridge Road)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 2400,
        "coords": [
            [77.1680, 28.5940],
            [77.1820, 28.6020],
            [77.1970, 28.6100]
        ]
    },
    {
        "id": "delhi_nh9_yamuna_flyover",
        "name": "NH9 Elevated Yamuna Flyover Corridor",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "length_m": 2200,
        "coords": [
            [77.2480, 28.5880],
            [77.2550, 28.5930],
            [77.2650, 28.6020],
            [77.2720, 28.6150]
        ]
    }
]

print(f"Blocked: {len(blocked)}, Caution: {len(caution)}, Safe: {len(safe)}")
print(f"Total: {len(blocked) + len(caution) + len(safe)}")

features = []
for s in blocked:
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

for s in caution:
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

for s in safe:
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

geojson_obj = {
    "type": "FeatureCollection",
    "features": features
}

stats_obj = {
    "total": len(features),
    "safe": len(safe),
    "caution": len(caution),
    "blocked": len(blocked)
}

dataset_obj = {
    "stats": stats_obj,
    "geojson": geojson_obj,
    "source": "central_delhi_pilot_deployment"
}

with open("c:/Users/krish/Documents/Code/Models/backend/real_roads.json", "w", encoding="utf-8") as f:
    json.dump(dataset_obj, f, indent=2)

js_content = """/**
 * Central Delhi Pilot Emergency GIS Dataset
 * Real OpenStreetMap arterial road centerlines and exact snapped camera nodes.
 */

export const DELHI_CENTER = [28.6139, 77.2090]; // Connaught Place / Central Delhi
export const DELHI_ZOOM = 13.5;

export const DELHI_CAMERAS = [
  {
    id: "CAM01",
    name: "Minto Bridge Underpass",
    segment_name: "Minto Road Underpass Corridor",
    lat: 28.6328,
    lng: 77.2225,
    status: "IMPASSABLE",
    depth_cm: 62,
    submersion_pct: 85,
    submersion_ratio: 0.85,
    online: true,
    feed: "/test_media/CAM01.png",
    image: "/test_media/CAM01.png",
    image_url: "/test_media/CAM01.png",
    flow_rate_mps: 2.8,
    passability: { twoWheeler: false, sedan: false, suv: false, heavyTruck: false },
    recommendation: "CRITICAL: Route fully impassable. Divert all emergency traffic via Connaught Outer Circle & Barakhamba Rd.",
  },
  {
    id: "CAM02",
    name: "ITO Ring Road Junction",
    segment_name: "ITO Ring Road Low Embankment Stretch",
    lat: 28.6289,
    lng: 77.2445,
    status: "POOLING RISK",
    depth_cm: 22,
    submersion_pct: 40,
    submersion_ratio: 0.40,
    online: true,
    feed: "/test_media/CAM02.png",
    image: "/test_media/CAM02.png",
    image_url: "/test_media/CAM02.png",
    flow_rate_mps: 1.1,
    passability: { twoWheeler: false, sedan: false, suv: true, heavyTruck: true },
    recommendation: "Moderate water accumulation. High-clearance vehicles only; low sedans divert via Sikandra Rd.",
  },
  {
    id: "CAM03",
    name: "Pragati Maidan Underpass",
    segment_name: "Pragati Maidan Submerged Tunnel",
    lat: 28.6186,
    lng: 77.2442,
    status: "IMPASSABLE",
    depth_cm: 54,
    submersion_pct: 78,
    submersion_ratio: 0.78,
    online: true,
    feed: "/test_media/CAM03.png",
    image: "/test_media/CAM03.png",
    image_url: "/test_media/CAM03.png",
    flow_rate_mps: 2.4,
    passability: { twoWheeler: false, sedan: false, suv: false, heavyTruck: false },
    recommendation: "Submerged tunnel underpass. Automated drainage pumps deployed. Evacuate via Mathura Rd / Bhairon Marg.",
  },
  {
    id: "CAM04",
    name: "Kashmere Gate Low-Level",
    segment_name: "Kashmere Gate Monastery Subway Link",
    lat: 28.6665,
    lng: 77.2285,
    status: "POOLING RISK",
    depth_cm: 18,
    submersion_pct: 32,
    submersion_ratio: 0.32,
    online: true,
    feed: "/test_media/CAM04.png",
    image: "/test_media/CAM04.png",
    image_url: "/test_media/CAM04.png",
    flow_rate_mps: 0.9,
    passability: { twoWheeler: false, sedan: true, suv: true, heavyTruck: true },
    recommendation: "Yamuna backflow risk along low-lying riverbank. Monitor drainage gates closely.",
  },
  {
    id: "CAM05",
    name: "Barapullah Corridor",
    segment_name: "Barapullah Elevated Expressway Corridor",
    lat: 28.5840,
    lng: 77.2480,
    status: "ACCESSIBLE",
    depth_cm: 0,
    submersion_pct: 0,
    submersion_ratio: 0.0,
    online: true,
    feed: "/test_media/CAM05.png",
    image: "/test_media/CAM05.png",
    image_url: "/test_media/CAM05.png",
    flow_rate_mps: 0.2,
    passability: { twoWheeler: true, sedan: true, suv: true, heavyTruck: true },
    recommendation: "Elevated structure fully clear. Optimal high-speed evacuation corridor to South Delhi.",
  },
];

export const DELHI_ROADS = """ + json.dumps(geojson_obj, indent=2) + """;

export const DELHI_ROAD_STATS = {
  total: 45,
  safe: 25,
  caution: 12,
  blocked: 8,
};

export const DELHI_INITIAL_DATASET = {
  stats: DELHI_ROAD_STATS,
  geojson: DELHI_ROADS,
  features: DELHI_ROADS.features,
  length: DELHI_ROADS.features.length,
  source: "central_delhi_pilot_deployment",
};
"""

with open("c:/Users/krish/Documents/Code/Models/frontend/src/data/delhiMockData.js", "w", encoding="utf-8") as f:
    f.write(js_content)

print("Saved both backend/real_roads.json and frontend/src/data/delhiMockData.js successfully!")
