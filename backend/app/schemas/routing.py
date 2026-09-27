from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class RouteRequest(BaseModel):
    origin_id: str = Field(..., description="Origin camera ID or landmark (e.g. CAM-07, station-7, Connaught Place)")
    destination_id: str = Field(..., description="Destination camera ID or landmark (e.g. CAM-02, station-2, ITO Crossing)")
    vehicle_type: Optional[str] = Field("car", description="Vehicle type: car, two_wheeler, pedestrian")


class Waypoint(BaseModel):
    station_id: str
    name: str
    latitude: float
    longitude: float
    water_level_cm: float
    status: Literal["safe", "caution", "danger"]


class RouteSummary(BaseModel):
    total_distance_km: float
    estimated_duration_min: float
    safety_rating: Literal["safe", "caution_advisory", "impassable"]
    waypoints_count: int
    danger_stations_avoided: List[str]
    caution_zones_encountered: List[str]


class RouteResponse(BaseModel):
    success: bool
    message: str
    summary: RouteSummary
    path_stations: List[Waypoint]
    coordinates: List[List[float]] = Field(..., description="Array of [latitude, longitude] snapped road coordinates")
