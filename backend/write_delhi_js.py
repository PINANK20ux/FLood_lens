import json

with open("c:/Users/krish/Documents/Code/Models/backend/real_roads.json", "r", encoding="utf-8") as f:
    data = json.load(f)

js_content = """/**
 * Central Delhi Pilot Emergency GIS Dataset
 * 100% reliable, zero-flicker, pre-baked with high-contrast colored flood lines
 * and active CCTV feeds permanently locked to Central Delhi.
 */

export const DELHI_CENTER = [28.6139, 77.2090]; // Connaught Place / Central Delhi
export const DELHI_ZOOM = 13.5;

export const DELHI_CAMERAS = [
  {
    id: "CAM01",
    name: "Minto Bridge Underpass",
    segment_name: "Minto Bridge Underpass Corridor",
    lat: 28.6328,
    lng: 77.2219,
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
    segment_name: "ITO Vikas Marg Corridor",
    lat: 28.6289,
    lng: 77.2407,
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
    segment_name: "Ring Road Monastery Link",
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
    segment_name: "Barapullah Elevated Bypass",
    lat: 28.5830,
    lng: 77.2450,
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

export const DELHI_ROADS = """ + json.dumps(data["geojson"], indent=2) + """;

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

print("Generated frontend/src/data/delhiMockData.js successfully")
