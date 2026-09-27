import math
import logging
from typing import Dict, List, Optional, Tuple
from ..core.config import settings

logger = logging.getLogger("floodlens.verifier")


def calculate_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates geodesic distance in meters between two coordinates."""
    try:
        from geopy.distance import geodesic
        return geodesic((lat1, lon1), (lat2, lon2)).meters
    except ImportError:
        # Fallback Haversine calculation in meters
        r = 6371000.0  # Earth radius in meters
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (
            math.sin(delta_phi / 2.0) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return r * c


def verify_citizen_report(
    report_lat: float,
    report_lon: float,
    camera_stations: List[Dict[str, any]],
    radius_meters: Optional[float] = None
) -> Tuple[bool, str, Optional[str], float]:
    """
    Performs 500m spatial auto-verification against live CCTV camera stations.

    Rules:
    - If distance <= 500m and nearest camera is 'caution' or 'danger':
        verified = True, verification_status = 'verified_camera'
    - If distance <= 500m and nearest camera is 'safe':
        verified = False, verification_status = 'rejected_clear'
    - If distance > 500m:
        verified = False, verification_status = 'pending_community'

    Returns:
        (verified, verification_status, nearest_station_id, min_distance_m)
    """
    radius = radius_meters if radius_meters is not None else settings.VERIFICATION_RADIUS_METERS

    if not camera_stations:
        return False, "pending_community", None, float("inf")

    nearest_station = None
    min_distance_m = float("inf")

    for station in camera_stations:
        st_lat = float(station.get("latitude", 0.0))
        st_lon = float(station.get("longitude", 0.0))
        dist_m = calculate_distance_meters(report_lat, report_lon, st_lat, st_lon)

        if dist_m < min_distance_m:
            min_distance_m = dist_m
            nearest_station = station

    if nearest_station is None:
        return False, "pending_community", None, min_distance_m

    station_status = str(nearest_station.get("status", "safe")).lower()
    station_id = nearest_station.get("id", "")

    if min_distance_m <= radius:
        if station_status in ("caution", "danger"):
            return True, "verified_camera", station_id, round(min_distance_m, 1)
        else:
            # Camera within 500m reports safe conditions
            return False, "rejected_clear", station_id, round(min_distance_m, 1)
    else:
        # Outside 500m radius of any active CCTV station
        return False, "pending_community", station_id, round(min_distance_m, 1)
