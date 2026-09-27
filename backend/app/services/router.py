import logging
import math
from typing import Any, Dict, List, Optional, Tuple
import httpx
import networkx as nx
from ..core.config import settings
from .verifier import calculate_distance_meters

logger = logging.getLogger("floodlens.router")

# Predefined Delhi corridor adjacency edges (Undirected road connections)
DELHI_EDGES = [
    ("CAM-07", "CAM-01"),  # Connaught Place <-> Minto Bridge
    ("CAM-07", "CAM-02"),  # Connaught Place <-> ITO Crossing (via Barakhamba)
    ("CAM-01", "CAM-02"),  # Minto Bridge <-> ITO Crossing (via DDU Marg)
    ("CAM-07", "CAM-06"),  # Connaught Place <-> Dhaula Kuan (via SP Marg)
    ("CAM-07", "CAM-08"),  # Connaught Place <-> AIIMS (via Aurobindo Marg)
    ("CAM-07", "CAM-03"),  # Connaught Place <-> Zakhira (via Pusa Rd)
    ("CAM-03", "CAM-06"),  # Zakhira <-> Dhaula Kuan (Ring Road West)
    ("CAM-06", "CAM-08"),  # Dhaula Kuan <-> AIIMS (Ring Road South)
    ("CAM-08", "CAM-05"),  # AIIMS <-> Moolchand (Ring Road South)
    ("CAM-05", "CAM-04"),  # Moolchand <-> Pul Prahladpur (Mathura Rd / Outer Ring)
    ("CAM-02", "CAM-05"),  # ITO <-> Moolchand (Ring Road East / Sarai Kale Khan)
    ("CAM-02", "CAM-08"),  # ITO <-> AIIMS (Mathura Rd bypass)
    ("CAM-03", "CAM-01"),  # Zakhira <-> Minto Bridge (Rohtak Rd bypass)
]

LANDMARK_ALIASES: Dict[str, str] = {
    "minto bridge": "CAM-01",
    "minto bridge railway underpass": "CAM-01",
    "ito": "CAM-02",
    "ito crossing": "CAM-02",
    "ito crossing / vikas marg": "CAM-02",
    "zakhira": "CAM-03",
    "zakhira underpass": "CAM-03",
    "pul prahladpur": "CAM-04",
    "pul prahladpur underpass": "CAM-04",
    "moolchand": "CAM-05",
    "moolchand underpass": "CAM-05",
    "moolchand underpass (ring road)": "CAM-05",
    "dhaula kuan": "CAM-06",
    "dhaula kuan flyover": "CAM-06",
    "dhaula kuan flyover loop": "CAM-06",
    "connaught place": "CAM-07",
    "connaught place outer circle": "CAM-07",
    "cp": "CAM-07",
    "aiims": "CAM-08",
    "aiims ring road": "CAM-08",
    "aiims - ring road corridor": "CAM-08",
}


def resolve_station_id(query: str, stations_by_id: Dict[str, Dict[str, Any]]) -> Optional[str]:
    """Resolves arbitrary user query (station ID, alias, landmark name) to canonical CAM-0X ID."""
    q = query.strip().lower()
    
    # Direct match
    if query.upper() in stations_by_id:
        return query.upper()

    # Normalize station-X -> CAM-0X
    if q.startswith("station-"):
        try:
            num = int(q.split("-")[1])
            cand = f"CAM-{num:02d}"
            if cand in stations_by_id:
                return cand
        except ValueError:
            pass

    # Normalized CAM-X -> CAM-0X
    if q.startswith("cam-"):
        try:
            num = int(q.split("-")[1])
            cand = f"CAM-{num:02d}"
            if cand in stations_by_id:
                return cand
        except ValueError:
            pass

    # Check aliases
    if q in LANDMARK_ALIASES:
        return LANDMARK_ALIASES[q]

    # Substring search in station names
    for st_id, st in stations_by_id.items():
        if q in st.get("name", "").lower():
            return st_id

    return None


class DelhiRoadRouter:
    """NetworkX dynamic flood-aware router with OSRM real road geometry snapping."""

    def __init__(self):
        self.osrm_url = settings.OSRM_BASE_URL.rstrip("/")
        self._http_client = httpx.AsyncClient(timeout=8.0)

    async def calculate_safe_route(
        self,
        origin_query: str,
        destination_query: str,
        camera_stations: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Dynamically prunes flooded/danger segments and calculates optimal safe route.
        """
        # Index stations by canonical ID
        stations_by_id: Dict[str, Dict[str, Any]] = {}
        for st in camera_stations:
            # Normalize ID
            s_id = st.get("id", "")
            if s_id.lower().startswith("station-"):
                num = int(s_id.split("-")[1])
                s_id = f"CAM-{num:02d}"
            elif s_id.upper().startswith("CAM-"):
                try:
                    num = int(s_id[4:])
                    s_id = f"CAM-{num:02d}"
                except ValueError:
                    s_id = s_id.upper()
            stations_by_id[s_id] = {**st, "id": s_id}

        origin_id = resolve_station_id(origin_query, stations_by_id)
        dest_id = resolve_station_id(destination_query, stations_by_id)

        if not origin_id or origin_id not in stations_by_id:
            raise ValueError(f"Unknown or invalid origin location: '{origin_query}'")
        if not dest_id or dest_id not in stations_by_id:
            raise ValueError(f"Unknown or invalid destination location: '{destination_query}'")

        if origin_id == dest_id:
            st = stations_by_id[origin_id]
            coords = [[st["latitude"], st["longitude"]]]
            return {
                "success": True,
                "message": "Origin and destination are the same location.",
                "summary": {
                    "total_distance_km": 0.0,
                    "estimated_duration_min": 0.0,
                    "safety_rating": "safe" if st.get("status") == "safe" else "caution_advisory",
                    "waypoints_count": 1,
                    "danger_stations_avoided": [],
                    "caution_zones_encountered": [st["name"]] if st.get("status") == "caution" else [],
                },
                "path_stations": [
                    {
                        "station_id": st["id"],
                        "name": st["name"],
                        "latitude": st["latitude"],
                        "longitude": st["longitude"],
                        "water_level_cm": st.get("water_level_cm", 0.0),
                        "status": st.get("status", "safe"),
                    }
                ],
                "coordinates": coords,
            }

        # Build NetworkX DiGraph (directed graph for asymmetric hazard weights)
        g = nx.DiGraph()

        # Add nodes with metadata
        for s_id, data in stations_by_id.items():
            g.add_node(
                s_id,
                name=data.get("name", s_id),
                status=data.get("status", "safe").lower(),
                lat=float(data.get("latitude", 0.0)),
                lon=float(data.get("longitude", 0.0)),
                water_level_cm=float(data.get("water_level_cm", 0.0)),
            )

        danger_stations: List[str] = []
        caution_stations: List[str] = []

        for s_id, data in stations_by_id.items():
            status = data.get("status", "safe").lower()
            if status == "danger":
                danger_stations.append(data.get("name", s_id))
            elif status == "caution":
                caution_stations.append(data.get("name", s_id))

        # Add edges with live dynamic weights
        # Weight formula:
        # Base weight = physical distance (km)
        # If target node is 'danger': weight = 1,000,000 (pruned unless it is start/end)
        # If target node is 'caution': weight = base * 3.0
        # If target node is 'safe': weight = base * 1.0
        for u, v in DELHI_EDGES:
            if u in stations_by_id and v in stations_by_id:
                u_lat, u_lon = stations_by_id[u]["latitude"], stations_by_id[u]["longitude"]
                v_lat, v_lon = stations_by_id[v]["latitude"], stations_by_id[v]["longitude"]
                base_dist_km = calculate_distance_meters(u_lat, u_lon, v_lat, v_lon) / 1000.0

                # Edge u -> v (entering v)
                v_status = stations_by_id[v].get("status", "safe").lower()
                if v_status == "danger" and v != dest_id and v != origin_id:
                    weight_u_to_v = 1_000_000.0  # Pruned
                elif v_status == "caution":
                    weight_u_to_v = base_dist_km * 3.0
                else:
                    weight_u_to_v = base_dist_km

                # Edge v -> u (entering u)
                u_status = stations_by_id[u].get("status", "safe").lower()
                if u_status == "danger" and u != dest_id and u != origin_id:
                    weight_v_to_u = 1_000_000.0  # Pruned
                elif u_status == "caution":
                    weight_v_to_u = base_dist_km * 3.0
                else:
                    weight_v_to_u = base_dist_km

                g.add_edge(u, v, weight=weight_u_to_v, distance_km=base_dist_km)
                g.add_edge(v, u, weight=weight_v_to_u, distance_km=base_dist_km)

        # Solve shortest path with Dijkstra
        try:
            path_node_ids = nx.shortest_path(g, source=origin_id, target=dest_id, weight="weight")
        except nx.NetworkXNoPath:
            # Fallback ignoring danger weights to still give a route with severe warning
            logger.warning(f"No fully safe path found between {origin_id} and {dest_id}. Calculating unconstrained fallback.")
            try:
                path_node_ids = nx.shortest_path(g, source=origin_id, target=dest_id, weight="distance_km")
            except Exception as e:
                raise RuntimeError(f"Unable to find routing path between {origin_id} and {dest_id}: {e}")

        # Extract waypoints
        path_stations = []
        waypoints_latlon: List[Tuple[float, float]] = []
        caution_zones_encountered = []
        contains_danger = False

        for node_id in path_node_ids:
            st = stations_by_id[node_id]
            st_status = st.get("status", "safe").lower()
            if st_status == "danger":
                contains_danger = True
            elif st_status == "caution":
                caution_zones_encountered.append(st.get("name", node_id))

            path_stations.append({
                "station_id": node_id,
                "name": st.get("name", node_id),
                "latitude": st["latitude"],
                "longitude": st["longitude"],
                "water_level_cm": float(st.get("water_level_cm", 0.0)),
                "status": st_status,
            })
            waypoints_latlon.append((st["latitude"], st["longitude"]))

        # Snapping to real road geometry using public OSRM API
        snapped_coords, osrm_distance_km, osrm_duration_min = await self._fetch_osrm_geometry(waypoints_latlon)

        safety_rating = "impassable" if contains_danger else ("caution_advisory" if caution_zones_encountered else "safe")
        avoided_danger = [d for d in danger_stations if d not in [p["name"] for p in path_stations]]

        summary = {
            "total_distance_km": round(osrm_distance_km, 2),
            "estimated_duration_min": round(osrm_duration_min, 1),
            "safety_rating": safety_rating,
            "waypoints_count": len(path_stations),
            "danger_stations_avoided": avoided_danger,
            "caution_zones_encountered": caution_zones_encountered,
        }

        return {
            "success": True,
            "message": f"Route generated ({len(path_stations)} corridor nodes, {len(avoided_danger)} flooded zones avoided).",
            "summary": summary,
            "path_stations": path_stations,
            "coordinates": snapped_coords,
        }

    async def _fetch_osrm_geometry(
        self,
        waypoints: List[Tuple[float, float]]
    ) -> Tuple[List[List[float]], float, float]:
        """
        Calls OSRM routing engine to fetch real street geometry for waypoints.
        Returns: (coordinates_list [[lat, lon], ...], total_distance_km, duration_min)
        """
        if len(waypoints) < 2:
            return [[lat, lon] for lat, lon in waypoints], 0.0, 0.0

        # OSRM format: lon,lat;lon,lat;...
        coord_strings = [f"{lon:.6f},{lat:.6f}" for lat, lon in waypoints]
        coord_query = ";".join(coord_strings)
        url = f"{self.osrm_url}/route/v1/driving/{coord_query}?overview=full&geometries=geojson"

        try:
            resp = await self._http_client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("code") == "Ok" and data.get("routes"):
                    route = data["routes"][0]
                    # GeoJSON is [lon, lat], convert to [lat, lon] for Leaflet
                    raw_coords = route["geometry"]["coordinates"]
                    leaflet_coords = [[c[1], c[0]] for c in raw_coords]
                    distance_km = float(route.get("distance", 0.0)) / 1000.0
                    duration_min = float(route.get("duration", 0.0)) / 60.0
                    return leaflet_coords, distance_km, duration_min
        except Exception as e:
            logger.warning(f"OSRM API call failed ({e}). Falling back to piecewise interpolation.")

        # Fallback: Piecewise linear interpolation between waypoints
        fallback_coords: List[List[float]] = []
        total_dist_km = 0.0

        for i in range(len(waypoints) - 1):
            p1 = waypoints[i]
            p2 = waypoints[i + 1]
            seg_dist = calculate_distance_meters(p1[0], p1[1], p2[0], p2[1]) / 1000.0
            total_dist_km += seg_dist

            steps = max(5, int(seg_dist * 3))
            for step in range(steps):
                t = step / float(steps)
                lat = p1[0] + t * (p2[0] - p1[0])
                lon = p1[1] + t * (p2[1] - p1[1])
                fallback_coords.append([round(lat, 6), round(lon, 6)])

        fallback_coords.append([waypoints[-1][0], waypoints[-1][1]])
        duration_min = (total_dist_km / 30.0) * 60.0  # Assumes 30 km/h avg city speed

        return fallback_coords, total_dist_km, duration_min


router_service = DelhiRoadRouter()
