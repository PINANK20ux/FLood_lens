/**
 * Central Delhi Pilot Emergency GIS Dataset
 * Relocated green corridors to Central Vista / India Gate and decluttered CP underpasses.
 */

export const DELHI_CENTER = [28.6180, 77.2180]; // Central Delhi (Central Vista & CP Axis)
export const DELHI_ZOOM = 13.8;

// Function to snap any start/end street segment to real road curvature
export async function snapCorridorToRoad(startCoords, endCoords) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startCoords[1]},${startCoords[0]};${endCoords[1]},${endCoords[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      return data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]);
    }
  } catch (e) {
    console.error("Failed to snap corridor:", e);
  }
  return [startCoords, endCoords]; // Fallback
}

export const RED_CORRIDOR_SNAPPED = [
  [28.6358, 77.2212], // DDU Marg Junction
  [28.6350, 77.2235],
  [28.6342, 77.2255],
  [28.6334, 77.2272], // Under Minto Railway Bridge
  [28.6330, 77.2295],
  [28.6328, 77.2325],
  [28.6326, 77.2355]  // Toward Delhi Gate
];

export const YELLOW_CORRIDOR_SNAPPED = [
  [28.6318, 77.2210], // CP Outer Circle exit
  [28.6292, 77.2222], // Tolstoy Marg Intersection
  [28.6265, 77.2235], // Ferozeshah Road Crossing
  [28.6225, 77.2252],
  [28.6185, 77.2268]  // Approaching Hexagon Outer
];

export const GREEN_CORRIDOR_SNAPPED = [
  [28.6145, 77.2005], // Vijay Chowk / Rashtrapati Bhavan
  [28.6140, 77.2065], // Rafi Marg Crossing
  [28.6135, 77.2140], // Janpath Crossing
  [28.6130, 77.2215], // Man Singh Road Crossing
  [28.6125, 77.2295]  // India Gate C-Hexagon
];

export const DELHI_CORRIDORS = [
  {
    "id": "minto_underpass",
    "name": "Minto Bridge Underpass",
    "status": "BLOCKED",
    "depth_cm": 62,
    "submersion_pct": 85,
    "elevation_sink": true,
    "length_m": 650,
    "coords": RED_CORRIDOR_SNAPPED
  },
  {
    "id": "tilak_bridge_rail_underpass",
    "name": "Tilak Bridge Railway Underpass",
    "status": "BLOCKED",
    "depth_cm": 50,
    "submersion_pct": 70,
    "elevation_sink": true,
    "length_m": 720,
    "coords": [
      [
        28.6272,
        77.237
      ],
      [
        28.626,
        77.2405
      ],
      [
        28.6255,
        77.2435
      ]
    ]
  },
  {
    "id": "kg_marg_waterlog",
    "name": "Kasturba Gandhi Marg",
    "status": "CAUTION",
    "depth_cm": 22,
    "submersion_pct": 41,
    "elevation_sink": true,
    "length_m": 1400,
    "coords": YELLOW_CORRIDOR_SNAPPED
  },
  {
    "id": "mandi_house_roundabout",
    "name": "Sikandra Road & Mandi House",
    "status": "CAUTION",
    "depth_cm": 18,
    "submersion_pct": 31,
    "elevation_sink": true,
    "length_m": 900,
    "coords": [
      [
        28.6258,
        77.2315
      ],
      [
        28.626,
        77.2345
      ],
      [
        28.625,
        77.239
      ]
    ]
  },
  {
    "id": "kartavya_path",
    "name": "Kartavya Path (Rajpath)",
    "status": "SAFE",
    "depth_cm": 0,
    "submersion_pct": 0,
    "elevation_sink": false,
    "length_m": 2900,
    "coords": GREEN_CORRIDOR_SNAPPED
  },
  {
    "id": "india_gate_hexagon",
    "name": "India Gate Hexagon Circle",
    "status": "SAFE",
    "depth_cm": 0,
    "submersion_pct": 0,
    "elevation_sink": false,
    "length_m": 1600,
    "coords": [
      [
        28.6145,
        77.228
      ],
      [
        28.614,
        77.2315
      ],
      [
        28.6125,
        77.2325
      ],
      [
        28.611,
        77.2305
      ],
      [
        28.6115,
        77.2275
      ],
      [
        28.6135,
        77.227
      ],
      [
        28.6145,
        77.228
      ]
    ]
  },
  {
    "id": "ashoka_road",
    "name": "Ashoka Road (Windsor Place toward India Gate)",
    "status": "SAFE",
    "depth_cm": 0,
    "submersion_pct": 0,
    "elevation_sink": false,
    "length_m": 1450,
    "coords": [
      [
        28.619,
        77.214
      ],
      [
        28.616,
        77.222
      ],
      [
        28.6135,
        77.227
      ]
    ]
  },
  {
    "id": "akbar_road",
    "name": "Akbar Road (Teen Murti to India Gate)",
    "status": "SAFE",
    "depth_cm": 0,
    "submersion_pct": 0,
    "elevation_sink": false,
    "length_m": 2800,
    "coords": [
      [
        28.601,
        77.202
      ],
      [
        28.608,
        77.218
      ],
      [
        28.6125,
        77.228
      ]
    ]
  }
];

export const ACTIVE_SAFE_ROUTE = {
  "origin": [
    28.6288,
    77.2085
  ],
  "destination": [
    28.6125,
    77.2295
  ],
  "path": [
    [
      28.6288,
      77.2085
    ],
    [
      28.6305,
      77.212
    ],
    [
      28.6325,
      77.216
    ],
    [
      28.6328,
      77.218
    ],
    [
      28.6324,
      77.2215
    ],
    [
      28.6292,
      77.227
    ],
    [
      28.6210,
      77.2280
    ],
    [
      28.6145,
      77.2280
    ],
    [
      28.6125,
      77.2295
    ]
  ]
};

export const DELHI_CAMERAS = [
  {
    "id": "CAM01",
    "name": "Minto Underpass",
    "segment_name": "Minto Road Underpass Corridor",
    "road_id": "minto_underpass",
    "lat": 28.6332,
    "lng": 77.227,
    "status": "IMPASSABLE",
    "depth_cm": 62.4,
    "submersion_pct": 84.5,
    "submersion_ratio": 0.85,
    "online": true,
    "feed": "/test_media/CAM01.png",
    "image": "/test_media/CAM01.png",
    "image_url": "/test_media/CAM01.png",
    "flow_rate_mps": 2.8,
    "passability": {
      "twoWheeler": false,
      "sedan": false,
      "suv": false,
      "heavyTruck": true
    },
    "recommendation": "CRITICAL: Underpass submerged (62cm). Divert via Central Vista arterial network."
  },
  {
    "id": "CAM02",
    "name": "Tilak Bridge Underpass",
    "segment_name": "Tilak Bridge Choke Point",
    "road_id": "tilak_bridge_rail_underpass",
    "lat": 28.626,
    "lng": 77.2405,
    "status": "IMPASSABLE",
    "depth_cm": 54.8,
    "submersion_pct": 77.0,
    "submersion_ratio": 0.77,
    "online": true,
    "feed": "/test_media/CAM02.png",
    "image": "/test_media/CAM02.png",
    "image_url": "/test_media/CAM02.png",
    "flow_rate_mps": 2.1,
    "passability": {
      "twoWheeler": false,
      "sedan": false,
      "suv": false,
      "heavyTruck": true
    },
    "recommendation": "Railway underpass flooded (55cm). Divert traffic via Sikandra Road / Mandi House."
  },
  {
    "id": "CAM03",
    "name": "Mandi House Circle",
    "segment_name": "Mandi House Choke Junction",
    "road_id": "mandi_house_roundabout",
    "lat": 28.6258,
    "lng": 77.234,
    "status": "POOLING RISK",
    "depth_cm": 18.5,
    "submersion_pct": 31.0,
    "submersion_ratio": 0.31,
    "online": true,
    "feed": "/test_media/CAM03.png",
    "image": "/test_media/CAM03.png",
    "image_url": "/test_media/CAM03.png",
    "flow_rate_mps": 1.2,
    "passability": {
      "twoWheeler": false,
      "sedan": true,
      "suv": true,
      "heavyTruck": true
    },
    "recommendation": "Caution advised at Mandi House roundabout entrance. Reduce transit speeds."
  },
  {
    "id": "CAM04",
    "name": "India Gate Hexagon",
    "segment_name": "India Gate Outer Memorial Circle",
    "road_id": "india_gate_hexagon",
    "lat": 28.6129,
    "lng": 77.2295,
    "status": "SAFE",
    "depth_cm": 0.0,
    "submersion_pct": 0.0,
    "submersion_ratio": 0.0,
    "online": true,
    "feed": "/test_media/CAM04.png",
    "image": "/test_media/CAM04.png",
    "image_url": "/test_media/CAM04.png",
    "flow_rate_mps": 0.0,
    "passability": {
      "twoWheeler": true,
      "sedan": true,
      "suv": true,
      "heavyTruck": true
    },
    "recommendation": "Elevated central roadway dry and clear. High-capacity accessible evacuation node."
  },
  {
    "id": "CAM05",
    "name": "Kartavya Path West",
    "segment_name": "Central Vista West Corridor",
    "road_id": "kartavya_path",
    "lat": 28.6145,
    "lng": 77.205,
    "status": "SAFE",
    "depth_cm": 0.0,
    "submersion_pct": 0.0,
    "submersion_ratio": 0.0,
    "online": true,
    "feed": "/test_media/CAM05.png",
    "image": "/test_media/CAM05.png",
    "image_url": "/test_media/CAM05.png",
    "flow_rate_mps": 0.0,
    "passability": {
      "twoWheeler": true,
      "sedan": true,
      "suv": true,
      "heavyTruck": true
    },
    "recommendation": "Wide grand boulevard clear. Optimal primary evacuation axis."
  },
  {
    "id": "CAM06",
    "name": "Live Node (Connaught Place)",
    "segment_name": "Mobile Field Unit / Primary Optical Sensor",
    "road_id": "cp_optical_node",
    "lat": 28.6328,
    "lng": 77.2195,
    "status": "SAFE",
    "depth_cm": 0.0,
    "submersion_pct": 0.0,
    "submersion_ratio": 0.0,
    "online": true,
    "feed": "/api/cameras/CAM06/stream",
    "image": "/api/cameras/CAM06/stream",
    "image_url": "/api/cameras/CAM06/stream",
    "flow_rate_mps": 0.0,
    "passability": {
      "twoWheeler": true,
      "sedan": true,
      "suv": true,
      "heavyTruck": true
    },
    "recommendation": "Live edge optical stream with real-time neural boundary segmentation."
  }
];

export const DELHI_ROADS = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "id": "minto_underpass",
        "road_id": "minto_underpass",
        "name": "Minto Bridge Underpass",
        "status": "BLOCKED",
        "depth_cm": 62,
        "submersion_pct": 85,
        "submersion_ratio": 85,
        "length_m": 650,
        "elevation_sink": true,
        "coords": RED_CORRIDOR_SNAPPED,
        "latlngs": RED_CORRIDOR_SNAPPED
      },
      "geometry": {
        "type": "LineString",
        "coordinates": RED_CORRIDOR_SNAPPED.map(pt => [pt[1], pt[0]])
      }
    },
    {
      "type": "Feature",
      "properties": {
        "id": "tilak_bridge_rail_underpass",
        "road_id": "tilak_bridge_rail_underpass",
        "name": "Tilak Bridge Railway Underpass",
        "status": "BLOCKED",
        "depth_cm": 50,
        "submersion_pct": 70,
        "submersion_ratio": 70,
        "length_m": 720,
        "elevation_sink": true,
        "coords": [
          [
            28.6272,
            77.237
          ],
          [
            28.626,
            77.2405
          ],
          [
            28.6255,
            77.2435
          ]
        ],
        "latlngs": [
          [
            28.6272,
            77.237
          ],
          [
            28.626,
            77.2405
          ],
          [
            28.6255,
            77.2435
          ]
        ]
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            77.237,
            28.6272
          ],
          [
            77.2405,
            28.626
          ],
          [
            77.2435,
            28.6255
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "id": "kg_marg_waterlog",
        "road_id": "kg_marg_waterlog",
        "name": "Kasturba Gandhi Marg",
        "status": "CAUTION",
        "depth_cm": 22,
        "submersion_pct": 41,
        "submersion_ratio": 41,
        "length_m": 1400,
        "elevation_sink": true,
        "coords": YELLOW_CORRIDOR_SNAPPED,
        "latlngs": YELLOW_CORRIDOR_SNAPPED
      },
      "geometry": {
        "type": "LineString",
        "coordinates": YELLOW_CORRIDOR_SNAPPED.map(pt => [pt[1], pt[0]])
      }
    },
    {
      "type": "Feature",
      "properties": {
        "id": "mandi_house_roundabout",
        "road_id": "mandi_house_roundabout",
        "name": "Sikandra Road & Mandi House",
        "status": "CAUTION",
        "depth_cm": 18,
        "submersion_pct": 31,
        "submersion_ratio": 31,
        "length_m": 900,
        "elevation_sink": true,
        "coords": [
          [
            28.6258,
            77.2315
          ],
          [
            28.626,
            77.2345
          ],
          [
            28.625,
            77.239
          ]
        ],
        "latlngs": [
          [
            28.6258,
            77.2315
          ],
          [
            28.626,
            77.2345
          ],
          [
            28.625,
            77.239
          ]
        ]
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            77.2315,
            28.6258
          ],
          [
            77.2345,
            28.626
          ],
          [
            77.239,
            28.625
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "id": "kartavya_path",
        "road_id": "kartavya_path",
        "name": "Kartavya Path (Rajpath)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "submersion_ratio": 0,
        "length_m": 2900,
        "elevation_sink": false,
        "coords": GREEN_CORRIDOR_SNAPPED,
        "latlngs": GREEN_CORRIDOR_SNAPPED
      },
      "geometry": {
        "type": "LineString",
        "coordinates": GREEN_CORRIDOR_SNAPPED.map(pt => [pt[1], pt[0]])
      }
    },
    {
      "type": "Feature",
      "properties": {
        "id": "india_gate_hexagon",
        "road_id": "india_gate_hexagon",
        "name": "India Gate Hexagon Circle",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "submersion_ratio": 0,
        "length_m": 1600,
        "elevation_sink": false,
        "coords": [
          [
            28.6145,
            77.228
          ],
          [
            28.614,
            77.2315
          ],
          [
            28.6125,
            77.2325
          ],
          [
            28.611,
            77.2305
          ],
          [
            28.6115,
            77.2275
          ],
          [
            28.6135,
            77.227
          ],
          [
            28.6145,
            77.228
          ]
        ],
        "latlngs": [
          [
            28.6145,
            77.228
          ],
          [
            28.614,
            77.2315
          ],
          [
            28.6125,
            77.2325
          ],
          [
            28.611,
            77.2305
          ],
          [
            28.6115,
            77.2275
          ],
          [
            28.6135,
            77.227
          ],
          [
            28.6145,
            77.228
          ]
        ]
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            77.228,
            28.6145
          ],
          [
            77.2315,
            28.614
          ],
          [
            77.2325,
            28.6125
          ],
          [
            77.2305,
            28.611
          ],
          [
            77.2275,
            28.6115
          ],
          [
            77.227,
            28.6135
          ],
          [
            77.228,
            28.6145
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "id": "ashoka_road",
        "road_id": "ashoka_road",
        "name": "Ashoka Road (Windsor Place toward India Gate)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "submersion_ratio": 0,
        "length_m": 1450,
        "elevation_sink": false,
        "coords": [
          [
            28.619,
            77.214
          ],
          [
            28.616,
            77.222
          ],
          [
            28.6135,
            77.227
          ]
        ],
        "latlngs": [
          [
            28.619,
            77.214
          ],
          [
            28.616,
            77.222
          ],
          [
            28.6135,
            77.227
          ]
        ]
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            77.214,
            28.619
          ],
          [
            77.222,
            28.616
          ],
          [
            77.227,
            28.6135
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "id": "akbar_road",
        "road_id": "akbar_road",
        "name": "Akbar Road (Teen Murti to India Gate)",
        "status": "SAFE",
        "depth_cm": 0,
        "submersion_pct": 0,
        "submersion_ratio": 0,
        "length_m": 2800,
        "elevation_sink": false,
        "coords": [
          [
            28.601,
            77.202
          ],
          [
            28.608,
            77.218
          ],
          [
            28.6125,
            77.228
          ]
        ],
        "latlngs": [
          [
            28.601,
            77.202
          ],
          [
            28.608,
            77.218
          ],
          [
            28.6125,
            77.228
          ]
        ]
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            77.202,
            28.601
          ],
          [
            77.218,
            28.608
          ],
          [
            77.228,
            28.6125
          ]
        ]
      }
    }
  ]
};

export const DELHI_ROAD_STATS = {
  "total": 8,
  "safe": 4,
  "caution": 2,
  "blocked": 2
};

export const DELHI_INITIAL_DATASET = {
  stats: DELHI_ROAD_STATS,
  geojson: DELHI_ROADS,
  features: DELHI_ROADS.features,
  length: DELHI_ROADS.features.length,
  source: "central_delhi_pilot_deployment",
};
